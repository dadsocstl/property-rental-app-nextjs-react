const MAX_IMAGES = 4;
const MAX_IMAGE_EDGE = 1600;

function text(formData, key) {
  return String(formData.get(key) ?? '').trim();
}

function number(formData, key, { required = false, label = key } = {}) {
  const raw = text(formData, key);
  if (!raw) {
    if (required) throw new Error(`${label} is required`);
    return null;
  }
  const value = Number(raw);
  if (!Number.isFinite(value) || value < 0) throw new Error(`${label} must be a positive number`);
  return value;
}

export function propertyFromForm(formData) {
  const name = text(formData, 'name');
  const type = text(formData, 'type');
  if (!name) throw new Error('Listing name is required');
  if (!type) throw new Error('Property type is required');

  return {
    name,
    type,
    description: text(formData, 'description'),
    location: {
      street: text(formData, 'location.street'),
      city: text(formData, 'location.city'),
      state: text(formData, 'location.state'),
      zipcode: text(formData, 'location.zipcode'),
    },
    beds: number(formData, 'beds', { required: true, label: 'Beds' }),
    baths: number(formData, 'baths', { required: true, label: 'Baths' }),
    square_feet: number(formData, 'square_feet', { required: true, label: 'Square feet' }),
    amenities: formData.getAll('amenities').map(String),
    rates: {
      weekly: number(formData, 'rates.weekly', { label: 'Weekly rate' }),
      monthly: number(formData, 'rates.monthly', { label: 'Monthly rate' }),
      nightly: number(formData, 'rates.nightly', { label: 'Nightly rate' }),
    },
    seller_info: {
      name: text(formData, 'seller_info.name'),
      email: text(formData, 'seller_info.email'),
      phone: text(formData, 'seller_info.phone'),
    },
  };
}

function loadImage(file) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const image = new Image();
    image.onload = () => {
      URL.revokeObjectURL(url);
      resolve(image);
    };
    image.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error(`Could not read image "${file.name}"`));
    };
    image.src = url;
  });
}

/** Downscales uploaded images to JPEG data URLs so they can be stored in the browser database. */
export async function imagesFromForm(formData) {
  const files = formData
    .getAll('images')
    .filter((file) => file instanceof File && file.size > 0 && file.type.startsWith('image/'));

  if (files.length === 0) throw new Error('Add at least one image');
  if (files.length > MAX_IMAGES) throw new Error(`You can upload up to ${MAX_IMAGES} images`);

  return Promise.all(
    files.map(async (file) => {
      const image = await loadImage(file);
      const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(image.width, image.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(image.width * scale);
      canvas.height = Math.round(image.height * scale);
      canvas.getContext('2d').drawImage(image, 0, 0, canvas.width, canvas.height);
      return canvas.toDataURL('image/jpeg', 0.82);
    })
  );
}
