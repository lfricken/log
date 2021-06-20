/** Primary Component. Index should only render this component. */

import * as React from 'react';
import { ReactNode } from 'react';

function About(): ReactNode
{
	return <div>
		This is a game based solely on game theory, meant for 5+ players.
	</div>;
}

export default About;
