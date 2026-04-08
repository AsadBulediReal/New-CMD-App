# Fullstack Web App CMD - Data Editor

A modern, high-performance React application for uploading, viewing, and editing CSV/Excel data. Built with speed and user experience in mind.

## 🚀 Features

### Core Functionality
-   **File Upload**: Drag-and-drop or select CSV/Excel files (.csv, .xlsx, .xls) for instant preview.
-   **Data Parsing**: Uses `xlsx` to safely parse and render data on the client side.

### Advanced Data Table
The data preview is packed with interactive features:
-   **Sticky Header**: Column headers stay fixed at the top while scrolling vertically.
-   **Sticky First Column**: The row index column remains visible while scrolling horizontally.
-   **Sorting**: Sort any column A-Z or Z-A by clicking the header text.
-   **Global Search**: Instantly filter rows across all columns using the search bar.
-   **Pagination**: Efficiently handles large datasets with numbered pagination.
-   **Renaming columns**: Rename any column header by clicking the **pencil icon (✎)**.
-   **Deletion**:
    -   Remove specific **columns** via the header '✕' button.
    -   Remove specific **rows** via the row '✕' button.

### User Experience Enhancements
-   **Help Tooltip**: A built-in feature guide (?) explaining available tools.
-   **Visual Feedback**:
    -   Sort indicators (↕ / ↑ / ↓) are visible by default.
    -   Remove buttons (✕) appear light gray and turn red on hover.
    -   "More records" indicator sticks to the center of the viewport.

## 🛠️ Tech Stack

-   **Frontend Framework**: [React](https://react.dev/) (v19) via [Vite](https://vitejs.dev/)
-   **Styling**: [Tailwind CSS](https://tailwindcss.com/) (v4)
-   **UI Components**: [shadcn/ui](https://ui.shadcn.com/) (built on Radix UI)
    -   Buttons, Inputs, Hover Cards
-   **Icons**: [Lucide React](https://lucide.dev/)
-   **Data Handling**: [SheetJS (xlsx)](https://sheetjs.com/) for file parsing.

## 📦 Installation

1.  **Clone the repository** (or navigate to the project directory):
    ```bash
    cd "New Cmd app Ai"
    ```

2.  **Install dependencies**:
    ```bash
    npm install
    ```

3.  **Run the development server**:
    ```bash
    npm run dev
    ```

4.  **Open the app**:
    Navigate to `http://localhost:5173` (or the port shown in your terminal).

## 📖 Usage Guide

1.  **Upload**: Click "Upload New File" or drag a file onto the drop zone.
2.  **Sort**: Click on any column name (e.g., "Amount") to sort the data.
3.  **Search**: Type in the search box (top right) to find specific rows.
4.  **Rename**: Click the pencil icon (✎) in a column header to rename it. Press Enter to save.
5.  **Clean Up**: Click '✕' on columns or rows you don't need before processing.

## 📄 License
This project is for educational and development purposes.
