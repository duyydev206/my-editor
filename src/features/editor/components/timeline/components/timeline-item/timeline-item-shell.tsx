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
            className='absolute box-border h-full w-full overflow-hidden rounded-md select-none'
            style={{
                borderWidth: isSelected ? 2 : 1.5,
                borderColor: isSelected ? "#0440c2" : "black",
                cursor: isLocked ? "not-allowed" : "pointer",
            }}>
            {children}
        </div>
    );
};

export default TimelineItemShell;
