import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import App from './App';
import Test1 from './test';
import reportWebVitals from './reportWebVitals';

function Test2() {
  const style = {
    backgroundColor: 'gray',
    color: 'white'
  }

  return (
    <div className='content' style={style}>
        <h2>Function Test</h2>
    </div>
  )
}
export default Test2;

const root = ReactDOM.createRoot(document.getElementById('root'));
root.render(
  <React.StrictMode>
    <App/>
    <App/>
    <App/>
    <Test1/>
    <Test2/>
  </React.StrictMode>
);

reportWebVitals();