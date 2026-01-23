import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import SearchBar from '../components/SearchBar'

describe('SearchBar', () => {
    it('renders input and button', () => {
        render(<SearchBar onSearch={() => { }} mode="fast" onModeChange={() => { }} />)
        expect(screen.getByPlaceholderText(/enter any topic/i)).toBeInTheDocument()
        expect(screen.getByRole('button', { name: /explain/i })).toBeInTheDocument()
    })

    it('calls onSearch with topic on submit', () => {
        const onSearch = vi.fn()
        render(<SearchBar onSearch={onSearch} mode="fast" onModeChange={() => { }} />)
        const input = screen.getByPlaceholderText(/enter any topic/i)
        fireEvent.change(input, { target: { value: 'Photosynthesis' } })
        fireEvent.submit(input.closest('form')!)
        expect(onSearch).toHaveBeenCalledWith('Photosynthesis')
    })

    it('disables button when loading', () => {
        render(<SearchBar onSearch={() => { }} loading mode="fast" onModeChange={() => { }} />)
        expect(screen.getByRole('button', { name: /generating/i })).toBeDisabled()
    })
})
