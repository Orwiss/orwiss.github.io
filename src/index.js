import React from 'react'
import ReactDOM from 'react-dom/client'
import './index.css'
import App from './App'
import Title from './Title'
import Head from './Head'
import reportWebVitals from './reportWebVitals'

export default function Main() {
  const bg = {
    height: '100vh',
    backgroundColor: 'gray',
    color: 'white'
  }

  return (
    <div className='bg' style={bg}>
        <Head/>
        <Title/>
    </div>
  )
}

const container = ReactDOM.createRoot(document.getElementById('container'));
container.render(
  <React.StrictMode>
    <App/>
  </React.StrictMode>
)

reportWebVitals()