import { BrowserRouter, Routes, Route } from 'react-router-dom';
import Home from './pages/Home';
import MobileSender from './pages/MobileSender';

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Home />} />
        <Route path="/mobile" element={<MobileSender />} />
      </Routes>
    </BrowserRouter>
  );
}

export default App;
