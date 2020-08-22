import { KeySelector, UnorderedMap, IReadonlyUnorderedMap, Iteration } from 'frl-ts-utils/lib/collections';
import { Undefinable, Stringifier, toDeepReadonly } from 'frl-ts-utils/lib/types';
import { createIterable, isNull } from 'frl-ts-utils/lib/functions';
import { Lazy } from 'frl-ts-utils/lib/lazy';

export type PersistElementState<TDestination, TSource = TDestination> =
{
    readonly destination: TDestination;
    readonly source: TSource;
};

function createLazyLookup<TKey, TValue>(
    collection: Iterable<TValue>,
    keySelector: KeySelector<TKey, TValue>,
    keyStringifier: Undefinable<Stringifier<TKey>>):
    Lazy<UnorderedMap<TKey, TValue>>
{
    return new Lazy<UnorderedMap<TKey, TValue>>(() =>
        {
            const result = new UnorderedMap<TKey, TValue>(keyStringifier);
            for (const obj of collection)
            {
                const key = keySelector(toDeepReadonly(obj));
                result.add(key, obj);
            }
            return result;
        });
}

export class CollectionState<TKey, TDestination, TSource = TDestination>
{
    public get destinationLookup(): IReadonlyUnorderedMap<TKey, TDestination>
    {
        return this._destinationLookup.value;
    }

    public get sourceLookup(): IReadonlyUnorderedMap<TKey, TSource>
    {
        return this._sourceLookup.value;
    }

    public readonly destination: Iterable<TDestination>;
    public readonly source: Iterable<TSource>;
    public readonly destinationKeySelector: KeySelector<TKey, TDestination>;
    public readonly sourceKeySelector: KeySelector<TKey, TSource>;
    public readonly keyStringifier: Undefinable<Stringifier<TKey>>;

    private _destinationLookup: Lazy<UnorderedMap<TKey, TDestination>>;
    private _sourceLookup: Lazy<UnorderedMap<TKey, TSource>>;

    public constructor(
        destination: Iterable<TDestination>,
        destinationKeySelector: KeySelector<TKey, TDestination>,
        source: Iterable<TSource>,
        sourceKeySelector: KeySelector<TKey, TSource>,
        keyStringifier?: Stringifier<TKey>)
    {
        this.destination = Iteration.Memoize(destination);
        this.destinationKeySelector = destinationKeySelector;
        this.source = Iteration.Memoize(source);
        this.sourceKeySelector = sourceKeySelector;
        this.keyStringifier = keyStringifier;
        this._destinationLookup = createLazyLookup(this.destination, this.destinationKeySelector, this.keyStringifier);
        this._sourceLookup = createLazyLookup(this.source, this.sourceKeySelector, this.keyStringifier);
    }

    public getObjectsToPersist(): Iterable<PersistElementState<TDestination, TSource>>
    {
        const objRange = this.source;
        const keySelector = this.sourceKeySelector;
        const lazyLookup = this._destinationLookup;

        return createIterable(function*()
            {
                const destinationLookup = lazyLookup.value;

                for (const obj of objRange)
                {
                    const key = keySelector(toDeepReadonly(obj));
                    const otherObj = destinationLookup.tryGet(key);

                    if (!isNull(otherObj))
                        yield {
                            destination: otherObj,
                            source: obj
                        };
                }
            });
    }

    public getObjectsToChange(
        isChangedPredicate: (data: PersistElementState<TDestination, TSource>) => boolean):
        Iterable<PersistElementState<TDestination, TSource>>
    {
        const objRange = this.source;
        const keySelector = this.sourceKeySelector;
        const lazyLookup = this._destinationLookup;

        return createIterable(function*()
            {
                const destinationLookup = lazyLookup.value;

                for (const obj of objRange)
                {
                    const key = keySelector(toDeepReadonly(obj));
                    const otherObj = destinationLookup.tryGet(key);

                    if (!isNull(otherObj))
                    {
                        const data: PersistElementState<TDestination, TSource> = {
                            destination: otherObj,
                            source: obj
                        };
                        if (isChangedPredicate(data))
                            yield data;
                    }
                }
            });
    }

    public getObjectsToAdd(): Iterable<TSource>
    {
        const objRange = this.source;
        const keySelector = this.sourceKeySelector;
        const lazyLookup = this._destinationLookup;

        return createIterable(function*()
            {
                const destinationLookup = lazyLookup.value;

                for (const obj of objRange)
                {
                    const key = keySelector(toDeepReadonly(obj));
                    if (!destinationLookup.has(key))
                        yield obj;
                }
            });
    }

    public getObjectsToRemove(): Iterable<TDestination>
    {
        const objRange = this.destination;
        const keySelector = this.destinationKeySelector;
        const lazyLookup = this._sourceLookup;

        return createIterable(function*()
            {
                const sourceLookup = lazyLookup.value;

                for (const obj of objRange)
                {
                    const key = keySelector(toDeepReadonly(obj));
                    if (!sourceLookup.has(key))
                        yield obj;
                }
            });
    }

    public handleChanges(
        onRemove: (obj: TDestination) => void,
        onPersist: (data: PersistElementState<TDestination, TSource>) => void,
        onAdd: (obj: TSource) => void):
        void
    {
        const sourceLookup = this._sourceLookup.value;
        const destinationLookup = this._destinationLookup.value;

        for (const sourceObj of this.source)
        {
            const key = this.sourceKeySelector(toDeepReadonly(sourceObj));
            const destinationObj = destinationLookup.tryGet(key);

            if (isNull(destinationObj))
                onAdd(sourceObj);
            else
                onPersist({
                    destination: destinationObj,
                    source: sourceObj
                });
        }
        for (const destinationObj of this.destination)
        {
            const key = this.destinationKeySelector(toDeepReadonly(destinationObj));
            if (!sourceLookup.has(key))
                onRemove(destinationObj);
        }
    }

    public buildUpdatedCollection(
        onPersist: (data: PersistElementState<TDestination, TSource>) => TDestination,
        onAdd: (obj: TSource) => TDestination):
        TDestination[]
    {
        const result: TDestination[] = [];
        const destinationLookup = this._destinationLookup.value;

        for (const sourceObj of this.source)
        {
            const key = this.sourceKeySelector(toDeepReadonly(sourceObj));
            const destinationObj = destinationLookup.tryGet(key);

            if (isNull(destinationObj))
                result.push(onAdd(sourceObj));
            else
                result.push(onPersist({
                    destination: destinationObj,
                    source: sourceObj
                }));
        }
        return result;
    }

    public containsChanges(isChangedPredicate: (data: PersistElementState<TDestination, TSource>) => boolean): boolean
    {
        const destinationLookup = this._destinationLookup.value;
        let toPersistCount = 0;

        for (const sourceObj of this.source)
        {
            const key = this.sourceKeySelector(toDeepReadonly(sourceObj));
            const destinationObj = destinationLookup.tryGet(key);

            if (isNull(destinationObj))
                return true;

            ++toPersistCount;
            if (isChangedPredicate({
                    destination: destinationObj,
                    source: sourceObj
                }))
                return true;
        }

        const toRemoveCount = destinationLookup.length - toPersistCount;
        return toRemoveCount > 0;
    }

    public refresh(): void
    {
        this._destinationLookup = createLazyLookup(this.destination, this.destinationKeySelector, this.keyStringifier);
        this._sourceLookup = createLazyLookup(this.source, this.sourceKeySelector, this.keyStringifier);
    }
}
