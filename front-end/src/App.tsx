import React from 'react';
import { BrowserRouter as Router, Routes, Route, Link } from 'react-router-dom';
import CVUpload from './components/CVUpload';
import JDUpload from './components/JDUpload';
import CVList from './components/CVList';
import JDList from './components/JDList';
import './App.css';

function App() {
  return (
    <Router>
      <div className="App">
        <header className="App-header">
          <nav className="navbar">
            <h1>CV-JD Matching System</h1>
            <div className="nav-links">
              <Link to="/upload-cv" className="nav-link">Upload CV</Link>
              <Link to="/upload-jd" className="nav-link">Upload JD</Link>
              <Link to="/cvs" className="nav-link">CV List</Link>
              <Link to="/jds" className="nav-link">JD List</Link>
            </div>
          </nav>
        </header>
        
        <main className="main-content">
          <Routes>
            <Route path="/" element={<Home />} />
            <Route path="/upload-cv" element={<CVUpload />} />
            <Route path="/upload-jd" element={<JDUpload />} />
            <Route path="/cvs" element={<CVList />} />
            <Route path="/jds" element={<JDList />} />
          </Routes>
        </main>
      </div>
    </Router>
  );
}

const Home = () => (
  <div className="home">
    <h2>Welcome to CV-JD Matching System</h2>
    <p>Upload and manage CVs and Job Descriptions</p>
    <div className="home-actions">
      <Link to="/upload-cv" className="btn btn-primary">Upload CV</Link>
      <Link to="/upload-jd" className="btn btn-primary">Upload JD</Link>
    </div>
  </div>
);

export default App;
