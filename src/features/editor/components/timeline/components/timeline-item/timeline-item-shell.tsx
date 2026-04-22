type TimelineItemShellProps = {
    children?: React.ReactNode;
    isLocked?: boolean;
    isSelected?: boolean;
};

const TimelineItemShell: React.FC<TimelineItemShellProps> = ({
    children,
    isLocked = false,
    isSelected = false,
}) => {
    return (
        <div
            className='absolute box-border h-full w-full overflow-hidden rounded-sm border select-none'
            style={{
                borderWidth: 1,
                borderColor: isSelected ? "#2563eb" : "black",
                cursor: isLocked ? "not-allowed" : "pointer",
                boxShadow: isSelected
                    ? "0 0 0 1px rgba(37,99,235,0.4)"
                    : undefined,
            }}>
            {children}
        </div>
    );
};

export default TimelineItemShell;
