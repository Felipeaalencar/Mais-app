import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App.jsx'

class ErrorBoundary extends React.Component {
  constructor(props) { super(props); this.state = { error: null }; }
  componentDidCatch(error) { this.setState({ error: error.toString() }); }
  render() {
    if (this.state.error) return (
      <div style={{padding:'20px',background:'#450a0a',color:'#fca5a5',fontFamily:'monospace',fontSize:'12px',lineHeight:'1.6'}}>
        <div style={{fontWeight:700,marginBottom:'10px'}}>ERRO:</div>
        <div>{this.state.error}</div>
      </div>
    );
    return this.props.children;
  }
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <ErrorBoundary><App /></ErrorBoundary>
)
