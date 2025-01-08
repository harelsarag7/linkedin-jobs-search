<div align="center">
 <h1> <img src="/public/linkedin-jobs-search.svg" width="80px"><br/>LinkedIn Jobs Search</h1>
 <img src="https://img.shields.io/badge/Node.js-43853D?style=for-the-badge&logo=node.js&logoColor=white"/>
 <img src="https://img.shields.io/badge/Express.js-404D59?style=for-the-badge"/>
 <img src="https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white"/>
</div>

LinkedIn Jobs Search - Enhanced is an open-source project that supercharges your job hunt with advanced search capabilities, a sleek user interface, and lightning-fast performance. Built with modern web technologies, it offers a streamlined, focused job search experience that puts you in control.

<br/>

[![Explore GitHub Profile README Generator](https://gradient-svg-generator.vercel.app/?text=👉+Try+It+Now!+👈&height=40&template=pride-rainbow)](https://linkedin-jobs-search.vercel.app/)

<br/>

https://github.com/user-attachments/assets/929bed01-7e81-4a77-8668-993b76827e09


![屏幕截图 2024-12-22 172825](https://github.com/user-attachments/assets/54e0af4e-6159-46e4-91e5-6600354d5de4)

![屏幕截图 2024-12-22 172840](https://github.com/user-attachments/assets/bf84022d-c23c-4ca2-a405-b1f17dd96f27)


## 🌟 Features

- 🔍 Advanced job search with multiple filters
- 📱 Responsive and modern UI design
- ⚡ Real-time search results
- 🎯 Detailed job information display
- 📄 Pagination support
- 🌐 Comprehensive search parameters including:
  - Keywords
  - Location
  - Date posted
  - Job type
  - Remote work options
  - Salary requirements
  - Experience level
  - Sort options

## 💪 Advantages Over LinkedIn

1. More Control: Fine-tune your search with parameters not available on LinkedIn's standard search.
2. Faster Results: Customizable result limits and efficient algorithms for quicker searches.
3. Clean Interface: Focused solely on job search without social network distractions.
4. Open Source: Transparent, customizable, and community-driven development.
5. Modern Tech Stack: Built with the latest web technologies for better performance and developer experience.

## 🔍 Search Like a Pro
Our advanced search options allow you to:

- Filter jobs by posting date, type, and remote options
- Set salary requirements and experience levels
- Customize the number of results per page
- Sort results by relevance or recency

## 💼 Perfect for

- Job seekers looking for more precise search results
- Recruiters needing detailed job market insights
- Developers interested in building on top of a modern job search platform

## 🛠️ Tech Stack

- **Frontend**: HTML, TailwindCSS, Vanilla JavaScript
- **Backend**: Node.js, Express
- **API**: LinkedIn Jobs API
- **Design**: Modern UI with glassmorphism effects

## 📋 Prerequisites

Before running this application, make sure you have:

- Node.js (v12 or higher)
- npm or yarn
- LinkedIn Jobs API access

## 🚀 Installation

1. Clone the repository:
```bash
git clone https://github.com/ChanMeng666/linkedin-jobs-search.git
cd linkedin-jobs-search
```

2. Install dependencies:
```bash
npm install
```

3. Create a `.env` file in the root directory:
```env
PORT=3000
```

4. Start the application:
```bash
# For production
npm start

# For development with auto-reload
npm run dev
```

## 🔍 Search Parameters

| Parameter | Description | Available Options |
|-----------|-------------|-------------------|
| keyword | Search term | Any text |
| location | Job location | Any location |
| dateSincePosted | Posting timeframe | past month, past week, 24hr |
| jobType | Type of position | full time, part time, contract, temporary, volunteer, internship |
| remoteFilter | Remote work options | on site, remote, hybrid |
| salary | Minimum salary | 40000, 60000, 80000, 100000, 120000 |
| experienceLevel | Required experience | internship, entry level, associate, senior, director, executive |
| sortBy | Result ordering | recent, relevant |
| limit | Results per page | Any number |
| page | Page number | 0, 1, 2... |

## 📚 API Endpoints

### Search Jobs
- **POST** `/api/jobs/search`
  - Basic job search with keyword and location

### Advanced Search
- **POST** `/api/jobs/advanced-search`
  - Advanced search with all available filters

### Recent Jobs
- **GET** `/api/jobs/recent`
  - Get jobs posted in the last 24 hours

### Experience-based Search
- **POST** `/api/jobs/by-experience`
  - Search jobs by experience level

### Salary-based Search
- **POST** `/api/jobs/by-salary`
  - Search jobs by salary range

### Remote Jobs
- **POST** `/api/jobs/remote`
  - Search for remote work opportunities

### Paginated Search
- **POST** `/api/jobs/paginated`
  - Get paginated search results

## 📁 Project Structure

```
├── public/
│   └── index.html         # Frontend interface
├── src/
│   ├── app.js            # Express application setup
│   ├── server.js         # Server entry point
│   ├── controllers/      # Request handlers
│   ├── routes/          # API routes
│   └── utils/           # Utility functions
├── package.json
└── README.md
```

## 🎨 UI Features

- Modern glassmorphism design
- Responsive layout with left-right split view
- Smooth animations and transitions
- Interactive job cards with hover effects
- Custom scrollbars
- Loading states and error handling
- Pagination controls with visual feedback
- Search statistics display

## 🤝 Contributing

1. Fork the repository
2. Create your feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit your changes (`git commit -m 'Add some AmazingFeature'`)
4. Push to the branch (`git push origin feature/AmazingFeature`)
5. Open a Pull Request

## 📄 License

This project is licensed under the MIT License - see the LICENSE file for details.

## 🙏 Acknowledgments

- LinkedIn Jobs API for providing the job data
- TailwindCSS for the styling framework
- Inter font family for typography
- Contributors and maintainers

## 📧 Contact

For any questions or suggestions, please feel free to reach out or create an issue in the repository.

## 🙋‍♀ Author

Created and maintained by [Chan Meng](https://github.com/ChanMeng666).
