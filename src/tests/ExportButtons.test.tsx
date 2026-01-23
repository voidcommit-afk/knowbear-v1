import { describe, it, expect } from 'vitest'
import { render, screen } from '@testing-library/react'
import ExportButtons from '../components/ExportButtons'

describe('ExportButtons', () => {
    it('renders text and json buttons, but not pdf', () => {
        render(<ExportButtons topic="Test" explanations={{}} />)
        expect(screen.getByText(/export \.txt/i)).toBeInTheDocument()
        expect(screen.getByText(/export \.json/i)).toBeInTheDocument()
        expect(screen.queryByText(/export \.pdf/i)).not.toBeInTheDocument()
    })

    it('buttons are clickable', () => {
        render(<ExportButtons topic="Test" explanations={{ eli5: 'test' }} />)
        const txtBtn = screen.getByText(/export \.txt/i)
        expect(txtBtn).not.toBeDisabled()
    })
})
