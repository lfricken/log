/** Primary Component. Index should only render this component. */

import * as React from 'react';
import { ReactNode } from 'react';
import { BrowserRouter, Redirect, Route } from 'react-router-dom';
import Game from './Game';
import About from './About';
import { Spinner } from 'react-bootstrap';
import 'bootstrap/dist/css/bootstrap.min.css';

interface Props { }
interface State { }
class App extends React.Component<Props, State>
{
	render(): ReactNode
	{
		// todo put a header at the top of the div
		return <div>
			<BrowserRouter>
				<Route exact path="/" render={(): ReactNode => { return <Redirect to="/home" />; }} />
				<Route exact path="/home" render={About} />
				<Route exact path="/about" render={About} />
				<Route path="/game" component={Game} />
			</BrowserRouter>
		</div>;
	}
}

export default App;
