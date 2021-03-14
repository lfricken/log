import { render } from '@testing-library/react';
import { test } from '@jest/globals'
import App from './App';
import React from 'React';
/// <reference path="node_modules/@types/testing-library__jest-dom/index.d.ts" />

test(
	'renders learn react link',
	() => {
		render(<App />);
		//const linkElement = screen.getByText(/learn react/i);
		//expect(linkElement).toBeInTheDocument();
	}
);
