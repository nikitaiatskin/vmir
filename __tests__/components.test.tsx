import { fireEvent, render, screen } from '@testing-library/react-native';

import { ItemForm } from '@/components/item-form';
import { EmptyState } from '@/components/ui';
import { emptyItemForm } from '@/features/items';

describe('ItemForm', () => {
  it('reports the changed field', async () => {
    const onChange = jest.fn();
    await render(<ItemForm value={emptyItemForm} onChange={onChange} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Shoes' }));
    expect(onChange).toHaveBeenCalledWith(expect.objectContaining({ category: 'shoes' }), 'category');
  });

  it('shows validation errors and AI suggestion badges', async () => {
    await render(
      <ItemForm
        value={{ ...emptyItemForm, name: 'Linen shirt' }}
        onChange={jest.fn()}
        errors={{ category: 'Choose a category' }}
        suggested={{ name: true }}
      />,
    );
    expect(screen.getByText('Choose a category')).toBeTruthy();
    expect(screen.getByLabelText('Suggested by Apple Intelligence')).toBeTruthy();
  });
});

describe('EmptyState', () => {
  it('renders the copy and action', async () => {
    const onAction = jest.fn();
    await render(<EmptyState text="Your wardrobe is empty." action="Add first item" onAction={onAction} />);
    await fireEvent.press(screen.getByRole('button', { name: 'Add first item' }));
    expect(onAction).toHaveBeenCalled();
  });
});
