import React from "react";

const ContentContainer = ({ children }: { children: React.ReactNode }) => {
  return (
    <section className="h-[calc(100%-1rem)] border border-white/10  rounded-lg px-4 py-6">
      {children}
    </section>
  );
};

export default ContentContainer;
