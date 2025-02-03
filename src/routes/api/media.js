import fs from 'fs';
import path from 'path';

export async function get() {
  const mediaFolder = path.join('static', 'media'); // Ensure media folder is in static
  let files = [];

  try {
    // Read all files in the media folder
    files = fs.readdirSync(mediaFolder).map((file) => {
      return {
        name: file,
        type: path.extname(file).substring(1), // Get the file extension type (image, video, etc.)
        path: `/media/${file}`, // The path to access the file from the browser
      };
    });
  } catch (err) {
    console.error('Error reading media folder:', err);
  }

  return {
    body: { files }, // Return the list of files as JSON
  };
}
