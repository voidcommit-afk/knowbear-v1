import { describe, it, expect, vi } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import LevelDropdown from '../components/LevelDropdown'

describe('LevelDropdown', () => {
    it('renders trigger button with selected label', () => {
        render(<LevelDropdown selected="eli5" onChange={() => {}} />)
        expect(screen.getByText(/like i'm 5/i)).toBeInTheDocument()
        expect(screen.queryByText(/like i'm 12/i)).not.toBeInTheDocument()
    })

    it('opens menu and calls onChange when option clicked', () => {
        const onChange = vi.fn()
        render(<LevelDropdown selected="eli5" onChange={onChange} />)

        fireEvent.click(screen.getByRole('button'))
        const option = screen.getByText(/like i'm 12/i)
        fireEvent.click(option)

        expect(onChange).toHaveBeenCalledWith('eli12')
    })
})
