import React from 'react';
import ReactDOM from 'react-dom/client';
import './index.css';
import Title from './Title';
import App from './App';
import './App.css';
import Test1 from './test';
import reportWebVitals from './reportWebVitals';
import Counter from './Counter';
import Input from './Input';
import OnAir from './OnAir';

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
    {/* <h1 style={{fontSize: '64pt', marginTop: '20px'}}>Sunghun Park</h1> */}
    <Title/>
    <Input/>
    <Counter/>
    <App/>
    <App/>
    <App/>
    <Test1/>
    <Test2/>
    <OnAir/>
  </React.StrictMode>
);

reportWebVitals();