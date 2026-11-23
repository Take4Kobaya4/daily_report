"use client";

import { LoginFormPresenter } from "./LoginFormPresenter";
import { useLoginForm } from "./useLoginForm";

export function LoginFormContainer() {
  const { register, errors, isSubmitting, errorMessage, handleSubmit } =
    useLoginForm();

  return (
    <LoginFormPresenter
      register={register}
      errors={errors}
      isSubmitting={isSubmitting}
      errorMessage={errorMessage}
      onSubmit={handleSubmit}
    />
  );
}
