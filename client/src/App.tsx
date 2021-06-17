/** Primary Component. Index should only render this component. */

import * as React from 'react';
import { ReactNode } from 'react';
import { BrowserRouter, Redirect, Route } from 'react-router-dom';
import Game from './Game';
import About from './About';

interface Props { }
interface State { }
class App extends React.Component<Props, State>
{
	render(): ReactNode
	{
		return (
			<BrowserRouter>
				<Route exact path="/" render={(): ReactNode => { return <Redirect to="/index" />; }} />
				<Route exact path="/index" render={About} />
				<Route exact path="/about" render={About} />
				<Route path="/game" component={Game} />
			</BrowserRouter>
		);
	}
}

export default App;
