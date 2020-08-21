/** Represents a potentially changed value. */
export class UpdateRef<T = any>
{
    /** Specifies whether or not the current and old values are different. */
    public get hasChanged(): boolean
    {
        return this.value !== this.oldValue;
    }

    /** Current value. */
    public readonly value: T;
    /** Old value. */
    public readonly oldValue: T;

    /**
     * Creates a new UpdateRef object.
     * @param value Current value.
     * @param oldValue Old value.
     */
    public constructor(
        value: T,
        oldValue: T)
    {
        this.value = value;
        this.oldValue = oldValue;
    }
}
