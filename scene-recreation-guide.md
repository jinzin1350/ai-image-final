# Complete Guide: Scene Recreation Service (Reference Photo Inspiration)

## Table of Contents
- [Service Overview](#service-overview)
- [How It Works](#how-it-works)
- [What Gets Copied from the Reference Photo](#what-gets-copied-from-the-reference-photo)
- [Scene Recreation vs Style Transfer](#scene-recreation-vs-style-transfer)
- [Step-by-Step Application Usage](#step-by-step-application-usage)
- [Prompts & AI Workflow](#prompts--ai-workflow)
- [Technical Features](#technical-features)
- [Best Practices for Optimal Results](#best-practices-for-optimal-results)
- [Use Cases](#use-cases)
- [Page Technical Architecture](#page-technical-architecture)
- [APIs Used](#apis-used)
- [SEO & Metadata](#seo--metadata)
- [FAQ](#faq)

---

## Service Overview

**Scene Recreation** (Persian: "الهام از عکس مرجع") is an advanced AI service that allows users to:

- Apply the style, lighting, composition, and mood of a professional photo to their own products
- Select reference photos from major global brands and see their own product in the same scene
- Create professional-quality photos without the need for expensive studios or locations

**Informational page:** `/services/scene-recreation.html`
**Application page:** `/scene-recreation.html`
**Live URL:** `https://fusionaiteam.com/services/scene-recreation.html`

---

## How It Works

### Overall Process (4 Steps):

1. **Select a Reference Photo:** Choose a photo whose style you like (from brands available in the system)
2. **Upload Your Product (Garment):** Upload your clothing or product — supports multiple garments simultaneously (pants + t-shirt + jacket)
3. **Choose a Model:** Select a model from the available options
4. **Generate the Photo:** AI produces a new photo with your product but in the reference photo's style

**Generation Time:** Typically 30-60 seconds

---

## What Gets Copied from the Reference Photo

| Element | Description |
|---------|-------------|
| **Lighting** | Light direction, intensity, color, and quality |
| **Background & Environment** | Studio, street, cafe, nature, etc. |
| **Camera Angle** | Overall composition and angle |
| **Mood** | Overall feeling and atmosphere of the photo |
| **Color Grading** | Color palette and tonal values |
| **Model Pose** | Body position and posture |
| **Color Temperature** | Warm / Cool / Neutral |
| **Depth of Field** | Bokeh and focus range |
| **Focal Length** | Lens characteristics (e.g., 85mm portrait) |

---

## Scene Recreation vs Style Transfer

| Feature | Scene Recreation (This Service) | Style Transfer |
|---------|-------------------------------|----------------|
| **Goal** | Complete scene and environment copy | Only transfers mood and atmosphere |
| **Lighting** | Precise lighting reconstruction | Changes color/light, not full reconstruction |
| **Product** | Your product replaces the reference product | Your product stays in place |
| **Model** | Model and product are swapped | Original content is preserved |
| **Best For** | Copying commercial/brand photos | Changing style and feeling of existing photos |

---

## Step-by-Step Application Usage

### Step 1: Select a Brand Reference Photo

On the application page (`/scene-recreation.html`):

1. Choose a reputable brand from the **brand dropdown**
2. Select the **model gender** (Woman / Man / Child)
3. From the displayed photos, **select one reference photo**
4. A preview of the selected photo is shown with a confirmation message

**Technical Note:** Only brands with `'recreation'` in their `service_types` array are displayed.

### Step 2: Upload Garment Image(s)

- Upload from your computer
- Supported formats: **JPG, PNG, WEBP**
- **Multiple garments** can be uploaded at once (e.g., pants + t-shirt + jacket)

### Step 3: Select a Model

Available model categories:
- **Brand Woman** — Female brand models
- **Brand Man** — Male brand models
- **Brand Girl** — Young female models
- **Brand Boy** — Young male models
- **Brand Plus Size** — Plus size brand models

### Step 3.1: Select Photography Angles

After selecting a model, the angle section appears:

| Angle Key | English Name | Persian Name | Description |
|-----------|-------------|--------------|-------------|
| `front` | Front View | نمای جلو | Direct front-facing shot of the model |
| `back` | Back View | نمای پشت | Model facing away, showing garment from behind |
| `left-side` | Left Side Profile | نمای سمت چپ | 90-degree side view from the left |
| `three-quarter-right` | Three-Quarter Front-Right | نمای سه رخ جلو-راست | 45-degree angle from front-right |

> **Note:** These 4 angles only control the camera **direction** (which side of the model to show). The **framing** (full-body, waist-up, etc.) is preserved from the reference photo. If the reference photo is full-body, the output will also be full-body regardless of the angle chosen.

- A separate photo is generated for **each selected angle**
- **Multiple angles** can be selected simultaneously

### Step 3.2: Select Hijab Type

Three options:
- **Full Hijab:** Complete and secure coverage — no hair visible
- **Relaxed Hijab:** Loose and modern hijab — some hair may be visible
- **No Hijab:** No head covering — hair fully visible

### Step 4: Generate the Photo

The **"Generate Professional Photo"** button becomes active when:
- A reference photo has been selected
- A garment has been uploaded
- A model has been selected

---

## Prompts & AI Workflow

### How the AI Analyzes the Reference Photo

When a user submits a reference photo and their product, the AI system extracts and analyzes these elements:

```
Reference Photo Analysis:
- Light Direction: [e.g., soft light from upper left]
- Color Temperature: [e.g., warm, approximately 5500K]
- Light Intensity & Softness: [e.g., soft diffused light]
- Background & Environment: [e.g., minimal white studio]
- Model Pose: [e.g., standing, hand on hip, direct gaze]
- Camera Angle: [e.g., eye level, full body]
- Focal Length: [e.g., 85mm portrait lens]
- Depth of Field: [e.g., shallow depth of field, f/2.8]
- Overall Color Grading: [e.g., neutral tones, slightly desaturated]
```

### Example Prompt Scenarios

#### 1. Copying a Luxury Brand Style
```
Reference Photo: Zara modeling photo with natural light on a Parisian street
Product: Black coat
Model: Brand Woman
Angle: Full body

→ AI Generates: Model wearing YOUR black coat, in a Parisian street setting
   with the same lighting and mood as the Zara reference
```

#### 2. Copying a Studio Catalog Shot
```
Reference Photo: H&M catalog shot with white background
Product: T-shirt + jeans
Model: Brand Man
Angle: Front view + Three-quarter

→ AI Generates: Male model wearing YOUR clothes, in a white studio
   similar to H&M's setup
```

#### 3. Exotic Location
```
Reference Photo: Beach modeling photo at sunset
Product: Summer dress
Model: Brand Woman
Hijab: No hijab

→ AI Generates: Model wearing YOUR summer dress on a beach
   with golden hour lighting
```

#### 4. Multi-Garment Fashion Editorial
```
Reference Photo: Vogue editorial in a modern loft
Product: Blazer + pants + blouse (3 garments uploaded)
Model: Brand Woman
Angles: Front + Three-quarter right + Back
Hijab: Relaxed

→ AI Generates: 3 photos (one per angle), model wearing your
   complete outfit in a modern loft setting matching the Vogue reference
```

### API Request Structure

The system sends the following data to the backend:

```javascript
{
    mode: 'scene-recreation',
    referencePhoto: {
        id: 'brand-photo-id',              // Reference photo ID from brand
        image_url: 'https://...',           // Reference photo URL
    },
    garmentImages: ['garment1.jpg', 'garment2.jpg'],  // Uploaded garment images
    model: {
        id: 'model-id',
        category: 'brand-woman'             // Model category
    },
    angles: ['front', 'three-quarter-right'],  // Selected photography angles
    hijab: 'full' | 'relaxed' | 'no-hijab',   // Hijab type selection
}
```

---

## Technical Features

### Intelligent Reference Photo Analysis

The system extracts these elements from the reference photo:

- Light direction
- Light color temperature
- Light intensity and softness
- Background and environment
- Model pose
- Camera angle
- Focal length
- Depth of field
- Overall color grading

### Acceptable Reference Photo Types

- Commercial product photos
- Fashion magazine editorials
- Brand Instagram posts
- Advertising campaign images
- Lookbook photos
- Studio photography

### Output Quality

- High resolution: up to **2048x2048 pixels**
- Lighting similarity: **80-95%** match with reference photo
- Background & environment: recognizably similar
- Model pose & position: as close as possible to reference

---

## Best Practices for Optimal Results

### Good Reference Photos:
- High quality and sharp
- Simple to moderate lighting (not overly complex)
- Recognizable background
- Product similar to yours (e.g., both are clothing items)

### Bad Reference Photos:
- Very dark or overexposed images
- Heavy Instagram filters
- Complex multi-source lighting setups
- Blurry or low-quality images
- Heavily edited or filtered photos

### Product Photography Tips (for garment uploads):
- **Adequate lighting:** Garment photo should be well-lit
- **Proper angle:** Shoot straight-on from a flat angle
- **Simple background:** Preferably white or plain background

---

## Use Cases

| Use Case | Description |
|----------|-------------|
| **Competing with Major Brands** | High-quality photos similar to big brands without their massive budgets |
| **Fashion Magazine Inspiration** | Get the Vogue, Elle, etc. style for your own products |
| **Visual Consistency** | Display all products with a uniform style for cohesive brand identity |
| **Exotic Locations** | Maldives beach, Parisian streets, etc. without travel costs |
| **Rapid Idea Testing** | Test different styles before investing in real photography |
| **Seasonal Campaigns** | Spring, summer, fall, winter — each with its own unique environment and lighting |

---

## Page Technical Architecture

### Related Files

| File | Purpose |
|------|---------|
| `/scene-recreation.html` | Main application page (form and functionality) |
| `/services/scene-recreation.html` | Informational/SEO page (service description) |
| `/script.js` | Main shared script across pages |
| `/service-auth-check.js` | User authentication verification |
| `/style.css` | Main stylesheet |
| `/mobile-menu.js` | Mobile menu handler |

### Key Global Variables (JavaScript)

```javascript
window.currentMode = 'scene-recreation';        // Current page mode
window.selectedBrandReferencePhoto = null;       // Selected reference photo object
window.selectedAngles = [];                      // Array of selected angle keys
allBrands = [];                                  // List of all loaded brands
allBrandPhotos = [];                             // Photos for currently selected brand
allAngleReferences = [];                         // Angle reference data from API
```

### Main Functions

| Function | Purpose |
|----------|---------|
| `loadBrands()` | Loads brand list from API; filters by `service_types` including `'recreation'` |
| `loadBrandPhotos()` | Loads photos for a brand; filters by gender and `photo_type=recreation` |
| `selectBrandReferencePhoto(photoId)` | Selects a reference photo; updates UI with preview and confirmation |
| `clearSelectedReferencePhoto()` | Clears the selected reference photo; resets UI |
| `loadAngleReferences()` | Loads photography angle options from API |
| `renderAngleOptions()` | Renders angle selection cards; falls back to defaults if API fails |
| `updateSelectedAngles()` | Updates `window.selectedAngles` array when checkboxes change |
| `showAngleSection()` | Shows the angle selection section (called when model is selected) |
| `hideAngleSection()` | Hides angle section and resets selections |
| `updateGenerateButtonState()` | Validates all conditions and enables/disables the generate button |

### UI Components

| Component | Description |
|-----------|-------------|
| **Brand Dropdown** | `<select id="brandSelect">` — Lists all recreation-enabled brands |
| **Gender Radio Buttons** | 3 options: Woman, Man, Child — filters brand photos by gender |
| **Brand Photos Grid** | Dynamic grid of clickable brand reference photos |
| **Selected Photo Preview** | Green-bordered preview showing the chosen reference photo |
| **Garment Upload Area** | Drag-and-drop or click-to-upload for garment images (supports multiple) |
| **Models Grid** | Grid of selectable AI models categorized by type |
| **Angle Options Grid** | Checkbox cards for selecting photography angles |
| **Hijab Options** | 3 clickable cards: Full, Relaxed, No Hijab |
| **Generate Button** | Disabled until all required selections are made |
| **Result Section** | Shows the generated AI photo with download option |
| **Loading Overlay** | Spinner shown during image generation |

---

## APIs Used

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/brands` | GET | Fetches all available brands |
| `/api/brands/{id}/photos` | GET | Fetches photos for a specific brand |
| `/api/angles` | GET | Fetches available photography angles |

### Brand Photos API Parameters:

```
GET /api/brands/{brandId}/photos?photo_type=recreation&gender=woman
```

| Parameter | Values | Description |
|-----------|--------|-------------|
| `photo_type` | `recreation` | Filters photos by service type |
| `gender` | `woman`, `man`, `child` | Filters photos by model gender |

---

## SEO & Metadata

The informational page (`/services/scene-recreation.html`) includes:

- **Title:** "الهام از عکس مرجع | بازسازی صحنه با هوش مصنوعی - Fusion AI"
- **Meta Description:** Describes the service for search engines
- **Keywords:** بازسازی صحنه, کپی استایل, الهام از عکس, reference photo, scene recreation, AI photography
- **Schema.org:** `Service` type with `serviceType: "AI Scene Recreation"`
- **Open Graph:** Configured for social media sharing (Facebook)
- **Twitter Cards:** `summary_large_image` card type
- **Canonical URL:** `https://fusionaiteam.com/services/scene-recreation.html`

---

## Tracking & Analytics

The page includes:
- **Google Analytics:** Tracking ID `G-3Z17GE6LBS`
- **Hotjar:** ID `6581743` — for user behavior tracking, heatmaps, and session recordings

---

## FAQ

**Can I use photos from other brands as reference?**
Yes. The final photo only copies the style, not the content. Your product and model are completely different from the reference.

**How similar will the result be to the reference photo?**
Typically 80-95% similarity. Lighting and background will be very close. Model pose and fine details may vary slightly.

**Can I try multiple reference photos for the same product?**
Yes. You can test different reference photos for each product and compare results.

**Are there copyright issues?**
No. Style and lighting cannot be copyrighted. Your product and model are entirely different from the reference.

**How is this different from real photography?**
Real photography is always the gold standard, but Scene Recreation lets you rapidly test hundreds of styles at a fraction of the cost. You can then select the best style for actual photography.

**How many reference photos can I use at once?**
One reference photo per generation. However, you can run multiple generations with different references separately.

**What's the maximum output resolution?**
Up to 2048x2048 pixels.

**How long does generation take?**
Typically 30-60 seconds, as reference photo analysis requires extra processing compared to other services.
