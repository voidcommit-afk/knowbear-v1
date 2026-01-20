import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LevelDropdown from '../components/LevelDropdown'
import { FREE_LEVELS } from '../types'

describe('LevelDropdown', () => {
    it('renders all free level buttons', () => {
        render(<LevelDropdown selected="eli5" onChange={() => { }} />)
        const buttons = screen.getAllByRole('button')
        expect(buttons).toHaveLength(FREE_LEVELS.length)
    })

    it('calls onChange when button clicked', () => {
        const onChange = vi.fn()
        render(<LevelDropdown selected="eli5" onChange={onChange} />)
        fireEvent.click(screen.getByText(/like i'm 10/i))
        expect(onChange).toHaveBeenCalledWith('eli10')
    })

    it('highlights selected level', () => {
        render(<LevelDropdown selected="eli5" onChange={() => { }} />)
        const btn = screen.getByText(/like i'm 5/i)
        expect(btn).toHaveClass('bg-accent-green')
    })
})
