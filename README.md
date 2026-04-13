# Cricket Content Editor (Video Slicer)

A high-performance, subtractive video editing tool designed specifically for processing and editing long-form cricket footage. It allows users to quickly slice videos and generate highlight reels.

## 🚀 Features

- **High-Performance Subtractive Editing:** Fast, frame-accurate video slicing tailored for cricket match highlights.
- **Optimized Video Player:** Custom frontend implementation bypassing standard React state for direct DOM manipulation to maintain playhead performance.
- **Robust Video Processing:** Backend relies on FFmpeg with optimized `libx264` re-encoding to ensure high-quality, glitch-free video outputs.
- **Full Stack Architecture:** A seamless integration between a modern React frontend and a reliable Java backend.

## 🛠 Tech Stack

- **Frontend:** React, HTML DOM manipulation for optimized video rendering
- **Backend:** Java (Spring Boot)
- **Video Processing:** FFmpeg with `libx264`

## 📁 Project Structure

- `/frontend` - Contains the React web application
- `/backend` - Contains the Java backend and FFmpeg service integration

## ⚙️ Getting Started

### Prerequisites

- Java 17+ (or equivalent versions)
- Node.js & npm/yarn
- FFmpeg installed and available in your system path

### Running the Backend

1. Navigate to the `/backend` directory.
2. Run the Java application using Maven or your preferred IDE.

### Running the Frontend

1. Navigate to the `/frontend` directory.
2. Install dependencies: `npm install`
3. Start the development server: `npm run dev` (or `npm start` depending on your setup)

## 📝 License

This project is licensed under the MIT License.
