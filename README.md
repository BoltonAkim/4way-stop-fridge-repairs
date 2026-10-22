# 4Way Stop Fridge Repairs

**A desktop business management application built with React, Vite, and Electron.**

4Way Stop Fridge Repairs is a Windows desktop application designed to help manage day-to-day business finances, record transactions, monitor profitability, and generate monthly financial statements.

The project explores how modern web technologies can be used to build a practical desktop application for a small business.

## Features

- **Business Dashboard:** View income, expenses, and profit summaries.
- **Transaction Management:** Record and track business financial transactions.
- **Financial Overview:** Monitor business performance using transaction data.
- **PDF Statements:** Generate monthly financial statements.
- **Backup and Restore:** Export and restore application data using JSON backups.
- **IRI-AI Assistant:** Interact with an assistant that supports text-based business commands.
- **Offline Desktop Access:** Run the application locally on Windows without needing to host it as a website.
- **Custom Branding:** Includes a custom business logo and Windows application icon.

## Technology Stack

| Technology | Purpose |
|---|---|
| React | User interface |
| Vite | Development server and production build |
| JavaScript | Application logic |
| CSS | Interface styling |
| Electron | Windows desktop application |
| electron-builder | Windows installer packaging |
| jsPDF | PDF statement generation |
| Git and GitHub | Version control and source code hosting |

## Getting Started

### Prerequisites

Install the following:

- [Node.js](https://nodejs.org/)
- [Git](https://git-scm.com/)
- [Visual Studio Code](https://code.visualstudio.com/) (recommended)

### Installation

Clone the repository:

```bash
git clone https://github.com/BoltonAkim/4way-stop-fridge-repairs.git
```

Open the project directory:

```bash
cd 4way-stop-fridge-repairs
```

Install dependencies:

```bash
npm install
```

### Run in Development Mode

Start the Vite development server:

```bash
npm run dev
```

### Build the Application

Create a production build:

```bash
npm run build
```

### Run as a Desktop Application

Build the production files and launch Electron:

```bash
npm run desktop
```

### Create a Windows Installer

```bash
npm run dist:win
```

The generated installer is placed in the `release` directory.

## Data and Privacy

The application uses browser-style local storage for transaction persistence. Data may be stored separately between the browser development version and the installed desktop application.

Use the application's backup and restore functionality to preserve important records. Keep customer information, financial records, credentials, and private backups out of public source code repositories.

## Project Goals

This project demonstrates practical experience with:

- Building a component-based interface with React.
- Developing and bundling a JavaScript application with Vite.
- Packaging a web application as a Windows desktop program with Electron.
- Managing business transaction data.
- Generating PDF reports.
- Implementing backup and restore workflows.
- Using Git and GitHub for version control.

## Future Improvements

Potential areas for continued development include:

- Improved financial reporting and analytics.
- Enhanced data validation and error handling.
- Automated testing.
- More advanced transaction filtering and search.
- Improved data portability and backup workflows.
- Additional business management features.

## Author

**Bolton Akim**

BSc Informatics student at the University of South Africa (UNISA).

This project is part of my practical software development journey, focused on applying programming and problem-solving skills to real-world business needs.

## License

No open-source license has been specified yet. All rights are reserved by the author unless a license is added to this repository.
