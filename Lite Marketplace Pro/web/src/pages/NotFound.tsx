import { LuArrowLeft } from "react-icons/lu";
import { ButtonLink } from "../components/ui";

export default function NotFound() {
  return (
    <div className="relative flex min-h-dvh flex-col items-center justify-center overflow-hidden px-6 text-center">
      <div className="grid-bg absolute inset-0" />
      <p className="relative animate-pop bg-gradient-to-b from-brand-400 to-brand-700 bg-clip-text text-[8rem] leading-none font-black text-transparent">404</p>
      <h1 className="relative mt-2 animate-fade-up text-2xl font-extrabold">This page went shopping.</h1>
      <p className="relative mt-2 animate-fade-up text-zinc-500 [animation-delay:100ms]">We couldn't find what you're looking for.</p>
      <div className="relative mt-8 animate-fade-up [animation-delay:200ms]">
        <ButtonLink to="/" icon={<LuArrowLeft />}>
          Back home
        </ButtonLink>
      </div>
    </div>
  );
}
