import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Dashboard } from './pages/Dashboard';
import { Detail } from './pages/Detail';
import { WilView } from './pages/WilView';
import { NewHypothesis } from './pages/NewHypothesis';

function App() {
  return (
    <BrowserRouter>
      <div style={{ minHeight: '100vh', background: '#f9fafb', fontFamily: '-apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif' }}>
        <Routes>
          <Route path="/" element={<Dashboard />} />
          <Route path="/hypothesis/:id" element={<Detail />} />
          <Route path="/wil" element={<WilView />} />
          <Route path="/new" element={<NewHypothesis />} />
        </Routes>
      </div>
    </BrowserRouter>
  );
}

export default App;
