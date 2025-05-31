###🦷 DentalInsight AI

DentalInsight AI is a full-stack web application that allows users to upload dental DICOM X-ray images, sends them to a Roboflow object detection model for pathology detection, overlays bounding boxes on the image, and prepares data for a future AI-generated diagnostic report.
3🚀 Features

* 📤 Upload DICOM (.dcm) X-ray images
* 🔍 Automatically detects dental pathologies using Roboflow
* 📦 Draws bounding boxes with color-coded confidence levels
* 📋 Displays detection metadata (class and confidence)
* 🧠 Integrate-ready with LLM for diagnostic report generation (coming soon)
* 🧰 Tech Stack

#Tools/Tech
- Frontend	React, Cornerstone.js, Cornerstone Tools
- DICOM Parsing	Cornerstone WADO Image Loader, dicom-parser
- Detection	Roboflow Hosted Inference API
- UX	FontAwesome, Canvas for drawing
- Planned	OpenAI GPT or similar LLM for report generation

#📸 How It Works
* Upload a DICOM dental X-ray.
* Image is parsed and rendered using cornerstone.
* When you click "Analyze":
  - The image is converted to PNG and sent to Roboflow.
  - Roboflow returns detection results.
  - Bounding boxes are drawn on a canvas overlay with confidence levels.
  - Detection results are displayed in a list.

#📦 Installation
1. Clone the repository
```git clone https://github.com/yourusername/dentalinsight-ai.git```
```cd dentalinsight-ai```
2. Install dependencies
```npm install```
3. Start the development server
```npm start```

#🖼️ Screenshot
<img width="861" alt="Screenshot 2025-05-31 at 2 10 01 PM" src="https://github.com/user-attachments/assets/2e39aeca-1fa4-4544-b335-9d3ce0284ac7" />

#📘 Future Roadmap
 Integrate LLM (e.g., GPT-4) for generating diagnostic reports from bounding boxes and metadata.
 Support for multiple DICOM slices.
 Export annotated images and reports as PDFs.
 Role-based dashboard for clinicians.

#🤝 Contributing
PRs are welcome! Please open an issue first to discuss significant changes.

#📄 License
This project is licensed under the [MIT License](./LICENSE).
