/** Primary Component. Index should only render this component. */

import React from 'react';


interface Props
{

}
interface State
{
}
class EditSettings extends React.Component<Props, State>
{
	state: State = EditSettings.getInitialState();

	public static getInitialState(): State
	{
		return {
			Game: null,
			Connections: [],
			LocalPlid: -1,
		};
	}
	// called before render
	constructor(props: Props)
	{
		super(props);
	}
	componentDidMount(): void
	{
		// we should not modify state until after mount
	}
	componentWillUnmount(): React.ReactNode
	{
		return null;
	}
}

export default EditSettings;
