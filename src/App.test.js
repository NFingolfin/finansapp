import { render, screen } from '@testing-library/react'
import App from './App'

test('renders the Finkod authentication screen', () => {
  render(<App />)
  expect(screen.getByRole('heading', { name: /hesabına giriş yap/i })).toBeInTheDocument()
  expect(screen.getByPlaceholderText(/e-posta/i)).toBeInTheDocument()
})
