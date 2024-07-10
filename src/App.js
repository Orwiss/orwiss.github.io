import React from 'react'
import { BrowserRouter as Router, Route, Routes} from 'react-router-dom'
import Jungang from './pages/Jungang'
import Main from '.';

const App = () => {
  return (
    <Router>
      <Routes>
      <Route path="/" element={<Main/>} />
      <Route path="/jungang" element={<Jungang/>} />
      </Routes>
    </Router>
  );
}

export default App