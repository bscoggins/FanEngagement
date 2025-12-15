import type { Meta } from '@storybook/react';
import { useState } from 'react';
import { Modal, type ModalSize } from './Modal';
import { Button } from './Button';

const meta: Meta<typeof Modal> = {
  title: 'Components/Overlays/Modal',
  component: Modal,
};

export default meta;

const ModalExample = ({
  size = 'md',
  closeOnBackdropClick = true,
  animation = 'slide',
  hasFooter = false,
  customHeader = false,
}: {
  size?: ModalSize;
  closeOnBackdropClick?: boolean;
  animation?: 'slide' | 'fade';
  hasFooter?: boolean;
  customHeader?: boolean;
}) => {
  const [isOpen, setIsOpen] = useState(false);

  const header = customHeader ? (
    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
      <span style={{ fontSize: '1.5rem' }}>⚙️</span>
      <h2 id="modal-title" className="modal-title">
        Custom Header
      </h2>
    </div>
  ) : undefined;

  const footer = hasFooter ? (
    <>
      <Button variant="secondary" onClick={() => setIsOpen(false)}>
        Cancel
      </Button>
      <Button variant="primary" onClick={() => setIsOpen(false)}>
        Confirm
      </Button>
    </>
  ) : undefined;

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Open Modal
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title={customHeader ? undefined : 'Modal Title'}
        size={size}
        closeOnBackdropClick={closeOnBackdropClick}
        animation={animation}
        header={header}
        footer={footer}
      >
        <p>This is the modal content. It can contain any React elements.</p>
        <p>
          The modal implements a focus trap, so tabbing cycles through interactive elements.
          Press <kbd>Escape</kbd> to close the modal.
        </p>
        {hasFooter && (
          <p className="mb-0">
            The footer provides action buttons aligned to the right.
          </p>
        )}
      </Modal>
    </>
  );
};

export const SmallSize = () => <ModalExample size="sm" />;
SmallSize.storyName = 'Small Size (sm)';

export const MediumSize = () => <ModalExample size="md" />;
MediumSize.storyName = 'Medium Size (md) - Default';

export const LargeSize = () => <ModalExample size="lg" />;
LargeSize.storyName = 'Large Size (lg)';

export const ExtraLargeSize = () => <ModalExample size="xl" />;
ExtraLargeSize.storyName = 'Extra Large Size (xl)';

export const FullSize = () => <ModalExample size="full" />;
FullSize.storyName = 'Full Size';

export const WithFooter = () => <ModalExample hasFooter />;
WithFooter.storyName = 'With Footer Actions';

export const CustomHeaderExample = () => <ModalExample customHeader />;
CustomHeaderExample.storyName = 'With Custom Header';

export const FadeAnimation = () => <ModalExample animation="fade" />;
FadeAnimation.storyName = 'Fade Animation';

export const NoBackdropClose = () => <ModalExample closeOnBackdropClick={false} />;
NoBackdropClose.storyName = 'Disable Backdrop Close';

export const ConfirmationDialog = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [confirmed, setConfirmed] = useState(false);

  const handleConfirm = () => {
    setConfirmed(true);
    setIsOpen(false);
    setTimeout(() => setConfirmed(false), 2000);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)} variant="danger">
        Delete Item
      </Button>
      {confirmed && (
        <p style={{ marginTop: '1rem', color: 'var(--color-success-600)' }}>
          ✓ Item deleted successfully
        </p>
      )}
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Confirm Deletion"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="danger" onClick={handleConfirm}>
              Delete
            </Button>
          </>
        }
      >
        <p>Are you sure you want to delete this item? This action cannot be undone.</p>
      </Modal>
    </>
  );
};
ConfirmationDialog.storyName = 'Confirmation Dialog Pattern';

export const LongContent = () => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Open Modal with Long Content
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="Terms and Conditions"
        size="lg"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Decline
            </Button>
            <Button variant="primary" onClick={() => setIsOpen(false)}>
              Accept
            </Button>
          </>
        }
      >
        <div>
          <h3>1. Introduction</h3>
          <p>
            Lorem ipsum dolor sit amet, consectetur adipiscing elit. Sed do eiusmod tempor
            incididunt ut labore et dolore magna aliqua. Ut enim ad minim veniam, quis nostrud
            exercitation ullamco laboris nisi ut aliquip ex ea commodo consequat.
          </p>
          
          <h3>2. User Responsibilities</h3>
          <p>
            Duis aute irure dolor in reprehenderit in voluptate velit esse cillum dolore eu
            fugiat nulla pariatur. Excepteur sint occaecat cupidatat non proident, sunt in
            culpa qui officia deserunt mollit anim id est laborum.
          </p>
          
          <h3>3. Privacy Policy</h3>
          <p>
            Sed ut perspiciatis unde omnis iste natus error sit voluptatem accusantium doloremque
            laudantium, totam rem aperiam, eaque ipsa quae ab illo inventore veritatis et quasi
            architecto beatae vitae dicta sunt explicabo.
          </p>
          
          <h3>4. Data Collection</h3>
          <p>
            Nemo enim ipsam voluptatem quia voluptas sit aspernatur aut odit aut fugit, sed quia
            consequuntur magni dolores eos qui ratione voluptatem sequi nesciunt.
          </p>
          
          <h3>5. Termination</h3>
          <p>
            Neque porro quisquam est, qui dolorem ipsum quia dolor sit amet, consectetur, adipisci
            velit, sed quia non numquam eius modi tempora incidunt ut labore et dolore magnam
            aliquam quaerat voluptatem.
          </p>
        </div>
      </Modal>
    </>
  );
};
LongContent.storyName = 'Long Scrollable Content';

export const Interactive = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({ name: '', email: '' });

  const handleSubmit = () => {
    alert(`Submitted: ${formData.name} - ${formData.email}`);
    setIsOpen(false);
  };

  return (
    <>
      <Button onClick={() => setIsOpen(true)}>
        Open Form Modal
      </Button>
      <Modal
        isOpen={isOpen}
        onClose={() => setIsOpen(false)}
        title="User Information"
        size="md"
        footer={
          <>
            <Button variant="secondary" onClick={() => setIsOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" onClick={handleSubmit}>
              Submit
            </Button>
          </>
        }
      >
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div>
            <label htmlFor="name" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
              Name
            </label>
            <input
              id="name"
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-default)',
              }}
            />
          </div>
          <div>
            <label htmlFor="email" style={{ display: 'block', marginBottom: '0.25rem', fontWeight: 500 }}>
              Email
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              style={{
                width: '100%',
                padding: '0.5rem',
                borderRadius: 'var(--radius-md)',
                border: '1px solid var(--color-border-default)',
              }}
            />
          </div>
        </div>
      </Modal>
    </>
  );
};
Interactive.storyName = 'Interactive Form Example';
