import { config } from '@/config';

type SectionTitleProps = {
    title: string;
    subtitle?: string;
};

export default function SectionTitle({ title, subtitle }: SectionTitleProps) {
    return (
        <div className="text-center mb-10">
            <h2 className="text-3xl font-bold mb-2 inline-block relative">
                {title}
                <span
                    className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-16 h-1 rounded-full"
                    style={{ backgroundColor: config.colors.primary }}
                ></span>
            </h2>
            {subtitle && <p className="text-gray-500 mt-4">{subtitle}</p>}
        </div>
    );
}
