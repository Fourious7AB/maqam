# Frontend Migration Guide: Adding Cloudinary Images to Existing Package & Offer Calls

> **Audience**: Frontend Developers who have **already built and integrated** the Package and Offer forms/APIs using standard JSON payloads, and now need to add image uploads.

---

## 🚀 Quick Migration Summary

You have **two simple ways** to integrate Cloudinary into your existing frontend code:

| Approach | Frontend Effort | How it Works |
| :--- | :---: | :--- |
| **Path 1: Zero Refactor (Recommended)** | 🟢 **~5 mins** | **Keep your existing JSON API call 100% unchanged.** Just upload files when selected, get Cloudinary URLs, and pass them into your existing `images: []` field. |
| **Path 2: Direct FormData (Single Request)** | 🟡 **~15 mins** | Convert the form submission from `application/json` to `FormData` so file uploads and form data are sent in one single HTTP request. |

---

## Path 1: Zero Refactor (Keep Existing JSON Submit)

If your form already calls `POST /api/v1/crm/offers` or `POST /api/v1/crm/packages` with a JSON payload, **do not touch that API call!**

### Step 1: Upload the files when selected by the user
When the user picks files in your `<input type="file" multiple />` or dropzone:

```javascript
// Function triggered on file input change or dropzone event
async function handleImageUpload(event) {
  const files = event.target.files;
  if (!files || files.length === 0) return;

  const uploadData = new FormData();
  for (const file of files) {
    uploadData.append("images", file);
  }

  // Choose the endpoint matching your page:
  // For Packages: /api/v1/crm/packages/upload-images
  // For Offers:   /api/v1/crm/offers/upload-images
  const res = await fetch("http://localhost:5002/api/v1/crm/packages/upload-images", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${adminToken}`,
      // Note: Do NOT set "Content-Type" manually
    },
    body: uploadData,
  });

  const response = await res.json();
  const uploadedUrls = response.data.urls; 
  // ["https://res.cloudinary.com/.../image1.jpg", "https://res.cloudinary.com/.../image2.jpg"]

  // Save URLs into your existing form state
  setFormData((prev) => ({
    ...prev,
    images: [...(prev.images || []), ...uploadedUrls],
  }));
}
```

### Step 2: Keep your existing `submit` function as-is!
Your existing `POST /api/v1/crm/packages` or `POST /api/v1/crm/offers` function remains **completely untouched**:

```javascript
// Your EXISTING form submission function - NO CHANGES NEEDED!
const res = await fetch("http://localhost:5002/api/v1/crm/packages", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${adminToken}`,
  },
  body: JSON.stringify({
    title: formData.title,
    destination: formData.destination,
    offerRefs: formData.offerRefs,
    images: formData.images, //  Now contains real Cloudinary URLs!
    bundleDiscountPercentage: formData.bundleDiscountPercentage,
    inclusions: formData.inclusions,
    itinerary: formData.itinerary,
  }),
});
```

---

## Path 2: Single-Request FormData (If You Prefer 1 API Call)

If you don't want two network calls and want to submit the form fields and binary files in **one single request**:

### What to change in your existing submit function:

#### ❌ Before (Your Existing JSON Call):
```javascript
// BEFORE
const res = await fetch("/api/v1/crm/offers", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    Authorization: `Bearer ${token}`,
  },
  body: JSON.stringify(formData),
});
```

#### ✅ After (FormData with Images attached):
```javascript
// AFTER
const body = new FormData();

// 1. Primitive fields
body.append("title", formData.title);
body.append("itemType", formData.itemType);
body.append("destination", formData.destination);
body.append("sellPrice", formData.sellPrice);
body.append("startDate", formData.startDate);
body.append("endDate", formData.endDate);

// 2. Objects & Arrays (MUST use JSON.stringify in FormData)
body.append("hotelRef", JSON.stringify(formData.hotelRef));
body.append("inclusions", JSON.stringify(formData.inclusions));

// (For packages, stringify offerRefs and itinerary)
// body.append("offerRefs", JSON.stringify(formData.offerRefs));
// body.append("itinerary", JSON.stringify(formData.itinerary));

// 3. Attach files
for (const file of selectedFiles) {
  body.append("images", file); // Key MUST be "images"
}

// 4. Send request (REMOVE Content-Type header!)
const res = await fetch("/api/v1/crm/offers", {
  method: "POST",
  headers: {
    Authorization: `Bearer ${token}`,
  
  },
  body: body,
});
```

---

## 3. Managing Images on Existing Packages / Offers

If your UI has an **"Edit Package"** drawer or modal and you want to let admins add or delete photos:

### Add More Photos to an Existing Package:
```http
POST /api/v1/crm/packages/:id/images
```
- Send `FormData` with `images` files, **OR** JSON with `{ "images": ["https://..."] }`.
- Appends new photos to the package without replacing existing ones.

### Delete a Photo from a Package:
```http
DELETE /api/v1/crm/packages/:id/images
Content-Type: application/json

{
  "imageUrl": "https://res.cloudinary.com/.../sample.jpg"
}
```
- Removes the URL from MongoDB and automatically deletes the asset from Cloudinary storage.

---

## 4. Frontend Specs & Constraints

- **File field name**: Always name the file input `images` (e.g. `formData.append("images", file)`).
- **Accepted formats**: JPG, JPEG, PNG, WEBP, GIF.
- **Max file size**: 5 MB per image.
- **Max files per upload**: Up to 10 images at once.
- **Customer Fallback**: If an admin creates a package and leaves `images: []` empty, the customer API automatically pulls images from its bundled hotel and flight offers!
