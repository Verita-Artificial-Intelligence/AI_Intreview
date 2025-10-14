import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Dashboard from './pages/Dashboard';
import Marketplace from './pages/Marketplace';
import InterviewPage from './pages/InterviewPage';
import '@/App.css';

function App() {
  return (
    <div className="App">
      <BrowserRouter>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/marketplace" element={<Marketplace />} />
          <Route path="/interview/:interviewId" element={<InterviewPage />} />
        </Routes>
      </BrowserRouter>
    </div>
  );
}

export default App;