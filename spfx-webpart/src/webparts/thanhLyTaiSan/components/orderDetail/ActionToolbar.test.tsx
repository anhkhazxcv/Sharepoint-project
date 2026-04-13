import * as React from 'react';
import * as ReactDOM from 'react-dom';
import { act } from 'react-dom/test-utils';
import { ActionToolbar } from './ActionToolbar';

/* eslint-disable @microsoft/spfx/pair-react-dom-render-unmount */

describe('ActionToolbar', () => {
  let container: HTMLDivElement;

  beforeEach(() => {
    container = document.createElement('div');
    document.body.appendChild(container);
  });

  afterEach(() => {
    ReactDOM.unmountComponentAtNode(container);
    container.remove();
  });

  function findButtonByText(text: string): HTMLButtonElement | null {
    const buttons: NodeListOf<HTMLButtonElement> = container.querySelectorAll('button');

    for (let index = 0; index < buttons.length; index += 1) {
      if (buttons[index].textContent === text) {
        return buttons[index];
      }
    }

    return null;
  }

  it('hides payment confirmation for non-admin users', () => {
    act(() => {
      ReactDOM.render(
        <ActionToolbar
          currentStep={'Thanh toán'}
          paymentStatus={'Chờ xác nhận'}
          handoverStatus={'Chưa bàn giao'}
          isAdmin={false}
          onConfirmPayment={jest.fn()}
          onConfirmHandover={jest.fn()}
        />,
        container
      );
    });

    expect(container.textContent).not.toContain('Xác nhận thanh toán');
  });

  it('renders admin payment action at payment step', () => {
    const onConfirmPayment = jest.fn();

    act(() => {
      ReactDOM.render(
        <ActionToolbar
          currentStep={'Thanh toán'}
          paymentStatus={'Chờ xác nhận'}
          handoverStatus={'Chưa bàn giao'}
          isAdmin={true}
          onConfirmPayment={onConfirmPayment}
          onConfirmHandover={jest.fn()}
        />,
        container
      );
    });

    const paymentButton = findButtonByText('Xác nhận thanh toán');

    expect(paymentButton).not.toBeNull();

    act(() => {
      paymentButton!.dispatchEvent(new MouseEvent('click', { bubbles: true }));
    });

    expect(onConfirmPayment).toHaveBeenCalledTimes(1);
  });

  it('disables handover confirmation when the order is already handed over', () => {
    act(() => {
      ReactDOM.render(
        <ActionToolbar
          currentStep={'Bàn giao'}
          paymentStatus={'Đã thanh toán'}
          handoverStatus={'Đã bàn giao'}
          isAdmin={true}
          onConfirmPayment={jest.fn()}
          onConfirmHandover={jest.fn()}
        />,
        container
      );
    });

    const handoverButton = findButtonByText('Xác nhận bàn giao');

    expect(handoverButton).not.toBeNull();
    expect(handoverButton!.disabled).toBe(true);
  });

  it('shows delete action only for admin orders that are unpaid and not handed over', () => {
    act(() => {
      ReactDOM.render(
        <ActionToolbar
          currentStep={'Thanh toán'}
          paymentStatus={'Chờ xác nhận'}
          handoverStatus={'Chưa bàn giao'}
          isAdmin={true}
          onConfirmPayment={jest.fn()}
          onConfirmHandover={jest.fn()}
          onDeleteOrder={jest.fn()}
        />,
        container
      );
    });

    expect(container.textContent).toContain('Xóa giao dịch');
  });

  it('hides delete action after payment is confirmed', () => {
    act(() => {
      ReactDOM.render(
        <ActionToolbar
          currentStep={'Bàn giao'}
          paymentStatus={'Đã thanh toán'}
          handoverStatus={'Chưa bàn giao'}
          isAdmin={true}
          onConfirmPayment={jest.fn()}
          onConfirmHandover={jest.fn()}
          onDeleteOrder={jest.fn()}
        />,
        container
      );
    });

    expect(container.textContent).not.toContain('Xóa giao dịch');
  });

  it('hides delete action after handover is confirmed', () => {
    act(() => {
      ReactDOM.render(
        <ActionToolbar
          currentStep={'Bàn giao'}
          paymentStatus={'Chờ xác nhận'}
          handoverStatus={'Đã bàn giao'}
          isAdmin={true}
          onConfirmPayment={jest.fn()}
          onConfirmHandover={jest.fn()}
          onDeleteOrder={jest.fn()}
        />,
        container
      );
    });

    expect(container.textContent).not.toContain('Xóa giao dịch');
  });
});
