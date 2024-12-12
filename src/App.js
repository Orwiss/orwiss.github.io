import React from 'react'
import { BrowserRouter as Router, Route, Routes} from 'react-router-dom'
import About from './pages/About'
import Main from '.';
import Title from './pages/Title'

const App = () => {
  return (
    <Router>
      <Routes>
      <Route path="/" element={<Title/>} />
      <Route path="/about" element={<About/>} />
      </Routes>
    </Router>
  );
}

export default App