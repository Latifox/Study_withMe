interface ConceptDescriptionProps {
  title: string;
  description: string;
  onContinue: () => void;
}

const ConceptDescription = ({ title, description, onContinue }: ConceptDescriptionProps) => {
  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">{title}</h2>
      <p className="text-lg leading-relaxed">{description}</p>
      <button
        onClick={onContinue}
        className="w-full bg-primary text-primary-foreground hover:bg-primary/90 px-4 py-2 rounded-lg"
      >
        Continue
      </button>
    </div>
  );
};

export default ConceptDescription;