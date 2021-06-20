/** Entry point of client side program. Should only be rendering the primary App. */

import * as React from 'react';
import * as ReactDom from 'react-dom';
import App from './App';
import './index.css';

ReactDom.render(
	<React.StrictMode>
		<App />
	</React.StrictMode>,
	document.getElementById('root')
);

// If you want to start measuring performance in your app, pass a function
// to log results (for example: reportWebVitals(console.log))
// or send to an analytics endpoint. Learn more: https://bit.ly/CRA-vitals
