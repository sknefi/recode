import { X } from "lucide-react";

type GuideDialogProps = {
  open: boolean;
  onClose: () => void;
};

export const GuideDialog = ({ open, onClose }: GuideDialogProps) => {
  if (!open) {
    return null;
  }

  return (
    <div className="guide-backdrop" role="presentation" onMouseDown={onClose}>
      <section
        className="guide-dialog"
        role="dialog"
        aria-modal="true"
        aria-labelledby="guide-title"
        onMouseDown={(event) => event.stopPropagation()}
      >
        <div className="guide-header">
          <div>
            <p className="eyebrow">Guide</p>
            <h2 id="guide-title">How To Practice</h2>
          </div>
          <button
            type="button"
            className="icon-button"
            onClick={onClose}
            aria-label="Close guide"
          >
            <X size={18} aria-hidden="true" />
          </button>
        </div>

        <div className="guide-content">
          <section>
            <h3>Recommended Path</h3>
            <ol>
              <li>Use Reference Mode when learning a new solution.</li>
              <li>Use Fog Mode to understand the structure.</li>
              <li>Use Missing Pieces to recall important lines.</li>
              <li>Use Function Skeleton to rebuild implementations.</li>
              <li>Use Exam Mode for final practice.</li>
            </ol>
          </section>

          <section>
            <h3>Practice Modes</h3>
            <dl>
              <dt>Reference Mode</dt>
              <dd>Shows the full reference while you write.</dd>
              <dt>Fog Mode</dt>
              <dd>Shows a blurred reference while you write.</dd>
              <dt>Missing Pieces</dt>
              <dd>Starts with selected lines blanked out.</dd>
              <dt>Function Skeleton</dt>
              <dd>Keeps function shells and removes bodies.</dd>
              <dt>Exam Mode</dt>
              <dd>Hides prompts and feedback until submit.</dd>
            </dl>
          </section>

          <section>
            <h3>Settings</h3>
            <dl>
              <dt>Strictness</dt>
              <dd>Strict requires exact text. Whitespace tolerant ignores spaces and tabs.</dd>
              <dt>Names</dt>
              <dd>Flexible names is beta and may miss edge cases in complex scopes.</dd>
              <dt>Feedback</dt>
              <dd>Choose instant, line-based, or submit-only checking.</dd>
              <dt>Masks</dt>
              <dd>Hide names or values in visible prompts for harder recall.</dd>
              <dt>Preview</dt>
              <dd>Shows the starter code before practice begins.</dd>
            </dl>
          </section>
        </div>
      </section>
    </div>
  );
};
