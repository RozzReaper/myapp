import { act, StrictMode } from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import axios from 'axios';
import App from './App';

jest.mock('axios', () => ({ get: jest.fn() }));

const listUrl = (offset = 0) =>
  `https://pokeapi.co/api/v2/pokemon/?limit=9&offset=${offset}`;
const detailUrl = (id) => `https://pokeapi.co/api/v2/pokemon/${id}/`;
const pokemon = (id) => ({
  id,
  name: `pokemon-${id}`,
  sprites: { front_default: `https://example.com/${id}.png` },
  abilities: [{ ability: { name: 'overgrow' } }],
  stats: [{ stat: { name: 'hp' }, base_stat: 45 }],
});

const page = (offset, count = 20) => ({
  count,
  next: offset + 9 < count ? listUrl(offset + 9) : null,
  previous: offset > 0 ? listUrl(Math.max(0, offset - 9)) : null,
  results: Array.from({ length: Math.min(9, count - offset) }, (_, i) => ({
    name: `pokemon-${offset + i + 1}`,
    url: detailUrl(offset + i + 1),
  })),
});

function mockPokeApi(count = 20) {
  axios.get.mockImplementation((url) => {
    const parsed = new URL(url);
    if (parsed.pathname === '/api/v2/pokemon/') {
      const offset = Number(parsed.searchParams.get('offset'));
      // Exact matching catches duplicated query strings and pagination parameters.
      if (url !== listUrl(offset)) {
        return Promise.reject(new Error(`Invalid pagination URL: ${url}`));
      }
      return Promise.resolve({ data: page(offset, count) });
    }
    const id = Number(parsed.pathname.split('/').filter(Boolean).pop());
    return Promise.resolve({ data: pokemon(id) });
  });
}

beforeEach(() => {
  axios.get.mockReset();
  mockPokeApi();
});

test('loads nine Pokémon and shows the real application interface', async () => {
  render(<App />);
  expect(screen.getByText('Pokémon API')).toBeInTheDocument();
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();

  await screen.findByRole('heading', { name: 'pokemon-9' });
  expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  expect(screen.getAllByRole('heading', { name: /^pokemon-/ })).toHaveLength(9);
  expect(axios.get).toHaveBeenCalledWith(listUrl());
  expect(axios.get).toHaveBeenCalledTimes(10);
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next' })).toBeEnabled();
});

test('selecting a Pokémon displays its artwork, abilities and base stats', async () => {
  render(<App />);
  fireEvent.click(await screen.findByRole('heading', { name: 'pokemon-1' }));

  expect(screen.getByRole('heading', { name: 'pokemon-1', level: 1 })).toBeInTheDocument();
  expect(screen.getByRole('heading', { name: 'overgrow' })).toBeInTheDocument();
  expect(screen.getByText('hp:45')).toBeInTheDocument();
  expect(document.querySelector('.right-content img')).toHaveAttribute(
    'src',
    'https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon/other/official-artwork/1.png'
  );
});

test('Next and Previous request valid URLs and replace the displayed page', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: 'pokemon-1' });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));

  await screen.findByRole('heading', { name: 'pokemon-10' });
  expect(axios.get).toHaveBeenCalledWith(listUrl(9));
  expect(screen.queryByRole('heading', { name: 'pokemon-1' })).not.toBeInTheDocument();
  expect(screen.getByText('2', { selector: '.active-page' })).toBeInTheDocument();

  fireEvent.click(screen.getByRole('button', { name: 'Previous' }));
  await screen.findByRole('heading', { name: 'pokemon-1' });
  expect(axios.get.mock.calls.filter(([url]) => url === listUrl())).toHaveLength(2);
  expect(screen.queryByRole('heading', { name: 'pokemon-10' })).not.toBeInTheDocument();
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
});

test('page numbers jump to the last page using the API count and correct offset', async () => {
  render(<App />);
  await screen.findByRole('heading', { name: 'pokemon-1' });
  const pagination = document.querySelector('.pagination');
  expect(pagination.querySelectorAll('span')).toHaveLength(3);
  fireEvent.click(screen.getByText('3', { selector: '.pagination span' }));

  await screen.findByRole('heading', { name: 'pokemon-19' });
  expect(axios.get).toHaveBeenCalledWith(listUrl(18));
  expect(screen.getAllByRole('heading', { name: /^pokemon-/ })).toHaveLength(2);
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Previous' })).toBeEnabled();
  const calls = axios.get.mock.calls.length;
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  expect(axios.get).toHaveBeenCalledTimes(calls);
});

test.each([0, 1, 9])('a count of %i shows one page with both navigation buttons disabled', async (count) => {
  mockPokeApi(count);
  render(<App />);
  await waitFor(() => expect(screen.queryByText('Loading...')).not.toBeInTheDocument());

  expect(document.querySelectorAll('.pagination span')).toHaveLength(1);
  expect(screen.getByRole('button', { name: 'Previous' })).toBeDisabled();
  expect(screen.getByRole('button', { name: 'Next' })).toBeDisabled();
});

test('keeps loading until all details arrive and renders cards in ID order', async () => {
  let resolveFirst;
  axios.get.mockImplementation((url) => {
    if (url === listUrl()) {
      return Promise.resolve({ data: {
        ...page(0, 2),
        results: [{ url: detailUrl(2) }, { url: detailUrl(1) }],
      } });
    }
    if (url === detailUrl(1)) {
      return new Promise((resolve) => { resolveFirst = resolve; });
    }
    return Promise.resolve({ data: pokemon(2) });
  });
  render(<App />);
  await waitFor(() => expect(axios.get).toHaveBeenCalledWith(detailUrl(1)));
  expect(screen.getByText('Loading...')).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'pokemon-2' })).not.toBeInTheDocument();

  await act(async () => { resolveFirst({ data: pokemon(1) }); });
  expect(screen.getAllByRole('heading', { name: /^pokemon-/ }).map((el) => el.textContent))
    .toEqual(['pokemon-1', 'pokemon-2']);
  expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
});

test.each(['list', 'details'])('handles a failed %s request and ends loading', async (request) => {
  if (request === 'list') {
    axios.get.mockRejectedValue(new Error('Network error'));
  } else {
    axios.get.mockImplementation((url) => url === listUrl()
      ? Promise.resolve({ data: page(0) })
      : Promise.reject(new Error('Detail error')));
  }
  render(<App />);
  expect(await screen.findByRole('alert')).toHaveTextContent('Unable to load Pokémon');
  expect(screen.queryByText('Loading...')).not.toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: /^pokemon-/ })).not.toBeInTheDocument();
});


test('ignores late responses from an effect replaced by StrictMode', async () => {
  let resolveStale;
  const respond = axios.get.getMockImplementation();
  axios.get.mockImplementationOnce(() => new Promise((resolve) => {
    resolveStale = resolve;
  })).mockImplementation(respond);

  render(<StrictMode><App /></StrictMode>);
  await screen.findByRole('heading', { name: 'pokemon-1' });
  fireEvent.click(screen.getByRole('button', { name: 'Next' }));
  await screen.findByRole('heading', { name: 'pokemon-10' });

  await act(async () => { resolveStale({ data: page(0) }); });
  expect(screen.getAllByRole('heading', { name: /^pokemon-/ })).toHaveLength(9);
  expect(screen.getByRole('heading', { name: 'pokemon-10' })).toBeInTheDocument();
  expect(screen.queryByRole('heading', { name: 'pokemon-1' })).not.toBeInTheDocument();
  expect(screen.getByText('2', { selector: '.active-page' })).toBeInTheDocument();
});
