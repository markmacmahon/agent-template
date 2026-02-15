"use client";

import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { editApp } from "@/components/actions/apps-action";
import { useActionState, useEffect } from "react";
import { SubmitButton } from "@/components/ui/submitButton";
import { usePageTitle } from "@/components/breadcrumb-context";

const initialState = { message: "" };

interface EditAppFormProps {
  app: {
    id: string;
    name: string;
    description?: string | null;
  };
}

export function EditAppForm({ app }: EditAppFormProps) {
  const { setPageTitle } = usePageTitle();
  const editAppWithId = editApp.bind(null, app.id);
  const [state, dispatch] = useActionState(editAppWithId, initialState);

  useEffect(() => {
    setPageTitle(app.name);
  }, [app.name, setPageTitle]);

  return (
    <div className="min-h-screen">
      <div className="max-w-4xl mx-auto p-6">
        <header className="mb-6">
          <h1 className="text-3xl font-semibold text-foreground">Edit App</h1>
          <p className="text-lg text-muted-foreground">
            Update the details of your app below.
          </p>
        </header>

        <form
          action={dispatch}
          className="bg-card rounded-lg shadow-lg p-8 space-y-6"
        >
          <div className="space-y-6">
            <div className="space-y-3">
              <Label htmlFor="name">App Name</Label>
              <Input
                id="name"
                name="name"
                type="text"
                placeholder="App name"
                defaultValue={app.name}
                required
                className="w-full"
              />
              {state.errors?.name && (
                <p className="text-destructive text-sm">{state.errors.name}</p>
              )}
            </div>

            <div className="space-y-3">
              <Label htmlFor="description">App Description</Label>
              <Input
                id="description"
                name="description"
                type="text"
                placeholder="Description of the app"
                defaultValue={app.description ?? ""}
                required
                className="w-full"
              />
              {state.errors?.description && (
                <p className="text-destructive text-sm">
                  {state.errors.description}
                </p>
              )}
            </div>
          </div>

          <SubmitButton text="Update App" />

          {state?.message && (
            <div className="mt-2 text-center text-sm text-destructive">
              <p>{state.message}</p>
            </div>
          )}
        </form>
      </div>
    </div>
  );
}
