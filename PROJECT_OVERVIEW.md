# Cricket Content Editor - Project & Feature Overview

## What is this project?
The **Cricket Content Editor** is a specialized, web-based video editing platform built for cricket enthusiasts, content creators, and brand managers. It provides an efficient workflow for taking long-form raw cricket footage (like local full match recordings) and intelligently slicing it into personalized, player-specific highlight reels. 

The application is built with a **React** frontend featuring a highly optimized, desktop-first UI, and a **Spring Boot** backend that leverages FFmpeg to process and encode the final video segments accurately.

## The Problem it Solves
Traditionally, editing a 3-hour local cricket match to find every boundary hit by a specific batsman, or every wicket taken by a bowler, requires importing the entire raw file into heavy generalized NLEs (like Premiere Pro or Final Cut). The creator must manually scrub, cut dead space, and carefully arrange clips on a timeline. This is tedious, error-prone, and slow.

The Cricket Content Editor solves this by providing a lightning-fast, domain-specific workflow:
1. **Data-entry style clipping:** Instead of complex timelines, users define timestamps and assign them to specific "Player Bags".
2. **Automated compilation:** The backend automatically takes these timestamps, precisely cuts the video, and stitches the clips together per player, turning one raw match into customized highlight reels for multiple players with a single click.

## Core Features & Capabilities Built

### 1. The "Player Bag" System (Multi-Player Categorization)
- **Dynamic Player Management:** Users can instantly create, rename, and manage discrete buckets ("bags") for individual players alongside the main video timeline.
- **Multi-Assignment:** A single timestamp (e.g., a great catch off a fast delivery) can be placed in multiple Player Bags (the bowler's bag and the fielder's bag) simultaneously.

### 2. Advanced Clip & Timestamp Workflow
- **Bulk Copy & Import:** Users can bulk "Copy All" unassigned timestamps from the master video and "Import" them directly into any Player Bag natively, removing the need for repetitive 1-by-1 dragging.
- **Persistent Unassigned Pool:** Timestamps remain in an "Unassigned" section until explicitly claimed or discarded, ensuring no valuable footage gets lost during processing.

### 3. Purpose-Built User Interface
- **Desktop-First, Split-Screen Layout:** The UI is designed to maximize productivity by keeping the video preview and the player management tools in view simultaneously. It drastically minimizes scrolling during intense editing sessions.
- **Optimized for 9:16 Vertical Video:** The layout and preview mechanics are built with vertical reel formats (Instagram Reels, TikTok, YouTube Shorts) in mind, reflecting the modern content consumption format.

### 4. High-Performance Architecture
- **Glitch-Free Video Playback (Frontend):** To handle heavy, long-form footage without browser lag, the video player's playhead is decoupled from React state, using direct DOM manipulation for buttery smooth scrubbing.
- **Frame-Accurate Encoding (Backend):** The Spring Boot backend processes edits using optimized `libx264` FFmpeg re-encoding. This ensures the final output has no glitches, dropped frames, or audio-desync issues—common problems with simpler "stream-copy" cutting methods.
- **CORS Configured API:** Secure and functional cross-origin communication between the modern React frontend and the Spring Boot API.

### 5. Automated "Leftovers" Processing
- Not sure if a clip was good? The backend is configured to automatically process and compile all remaining unassigned segments into their own dedicated "leftover" output file, making it easy to review uncut footage later.

---
**Summary:** The Cricket Content Editor is no longer just a basic video slicer; it has evolved into a full-scale multi-player highlight generator engineered to eliminate the friction from modern cricket content creation.
