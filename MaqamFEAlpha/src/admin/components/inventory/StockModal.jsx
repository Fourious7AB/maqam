import { useEffect, useState } from "react";

import Modal from "../common/Modal";
import Button from "../common/Button";
import Input from "../common/Input";

export default function StockModal({
  open,
  title,
  initial = {},
  fields = [],
  onClose,
  onSubmit,
  loading = false,
}) {
  const [form, setForm] = useState({});

  // IMPORTANT:
  // Only reset the form when the modal opens.
  // Do not put `initial` in the dependency array because
  // parent components may create a new object on every render.
  useEffect(() => {
    if (!open) {
      return;
    }

    setForm({
      ...(initial || {}),
    });
  }, [open]);

  const updateField = (key, value) => {
    setForm((previous) => ({
      ...previous,
      [key]: value,
    }));
  };

  const handleSubmit = (event) => {
    event.preventDefault();

    if (typeof onSubmit !== "function") {
      return;
    }

    onSubmit(form);
  };

  if (!open) {
    return null;
  }

  return (
    <Modal
      open={open}
      title={title}
      onClose={onClose}
      size="lg"
    >
      <form onSubmit={handleSubmit}>
        <div className="grid gap-4 md:grid-cols-2">
          {fields.map((field) => {
            const fieldValue = form[field.key];

            return (
              <Input
                key={field.key}
                label={field.label}
                type={field.type || "text"}
                value={fieldValue ?? ""}
                min={field.min}
                max={field.max}
                step={field.step}
                placeholder={field.placeholder}
                disabled={field.disabled}
                required={field.required}
                onChange={(event) => {
                  const rawValue = event.target.value;

                  let value = rawValue;

                  if (field.type === "number") {
                    value =
                      rawValue === ""
                        ? ""
                        : Number(rawValue);
                  }

                  updateField(field.key, value);
                }}
              />
            );
          })}
        </div>

        <div className="mt-6 flex justify-end gap-2">
          <Button
            type="button"
            variant="secondary"
            onClick={onClose}
            disabled={loading}
          >
            Cancel
          </Button>

          <Button
            type="submit"
            loading={loading}
          >
            Save
          </Button>
        </div>
      </form>
    </Modal>
  );
}