/**
 * Entry point for react render.
 */

import * as React from 'react';
import * as ReactDom from 'react-dom';
import './index.css';
import App from './App';

console.log('Client start rendering App in browser.')
ReactDom.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
	document.getElementById('root')
);
console.log('Client end rendering App in browser')

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
