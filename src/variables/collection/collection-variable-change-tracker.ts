import { Nullable, Ensured, DeepReadonly, Undefinable, toDeepReadonly } from 'frl-ts-utils/lib/types';
import { isNull, Assert, reinterpretCast, isDefined, isUndefined, isInstanceOfType } from 'frl-ts-utils/lib/functions';
import { UnorderedMap, IReadonlyKeyedCollection, Iteration, MapEntry, makeMapEntry, KeyedCollection } from 'frl-ts-utils/lib/collections';
import { IEventListener } from 'frl-ts-utils/lib/events';
import { VariableChangeTrackerBase } from '../variable-change-tracker-base.abstract';
import { ICollectionVariableChangeTracker } from './collection-variable-change-tracker.interface';
import { CollectionVariableChanges } from './collection-variable-changes.abstract';
import { IReadonlyCollectionVariable } from './readonly-collection-variable.interface';
import { CollectionVariableElementChange } from './collection-variable-element-change';
import { CollectionVariableElementChangeType } from './collection-variable-element-change-type.enum';
import { UpdateRef } from '../../update-ref';
import { VariableBase } from '../variable-base.abstract';
import { CollectionVariableChangeEvent } from './collection-variable-change-event';
import { CollectionVariableElementChangeEvent } from './collection-variable-element-change-event';

class MutableCollectionVariableElementChange<TKey, TElement>
    extends
    CollectionVariableElementChange<TKey, TElement>
{
    public static CreateAdded<K, E>(
        key: DeepReadonly<K>,
        currentElement: E,
        elementChanges: Nullable<object>):
        MutableCollectionVariableElementChange<K, E>
    {
        return new MutableCollectionVariableElementChange<K, E>(
            key, null, toDeepReadonly(currentElement), CollectionVariableElementChangeType.Added, elementChanges);
    }

    public static CreateRemoved<K, E>(
        key: DeepReadonly<K>,
        originalElement: E):
        MutableCollectionVariableElementChange<K, E>
    {
        return new MutableCollectionVariableElementChange<K, E>(
            key, toDeepReadonly(originalElement), null, CollectionVariableElementChangeType.Removed, null);
    }

    public static CreateReplaced<K, E>(
        key: DeepReadonly<K>,
        originalElement: E,
        currentElement: E,
        elementChanges: Nullable<object>):
        MutableCollectionVariableElementChange<K, E>
    {
        return new MutableCollectionVariableElementChange<K, E>(
            key,
            toDeepReadonly(originalElement),
            toDeepReadonly(currentElement),
            CollectionVariableElementChangeType.Replaced,
            elementChanges);
    }

    public static CreateChanged<K, E>(
        key: DeepReadonly<K>,
        originalElement: E,
        currentElement: E,
        elementChanges: object):
        MutableCollectionVariableElementChange<K, E>
    {
        return new MutableCollectionVariableElementChange<K, E>(
            key,
            toDeepReadonly(originalElement),
            toDeepReadonly(currentElement),
            CollectionVariableElementChangeType.Changed,
            elementChanges);
    }

    public static CreateRestoredAsExisting<K, E>(
        key: DeepReadonly<K>,
        originalElement: E,
        currentElement: E):
        MutableCollectionVariableElementChange<K, E>
    {
        return new MutableCollectionVariableElementChange<K, E>(
            key,
            toDeepReadonly(originalElement),
            toDeepReadonly(currentElement),
            CollectionVariableElementChangeType.RestoredAsExisting,
            null);
    }

    public static CreateRestoredAsMissing<K, E>(
        key: DeepReadonly<K>,
        currentElement: E):
        MutableCollectionVariableElementChange<K, E>
    {
        return new MutableCollectionVariableElementChange<K, E>(
            key, null, toDeepReadonly(currentElement), CollectionVariableElementChangeType.RestoredAsMissing, null);
    }

    public elementChanges: Nullable<object>;

    public constructor(
        key: DeepReadonly<TKey>,
        originalElement: Nullable<DeepReadonly<TElement>>,
        currentElement: Nullable<DeepReadonly<TElement>>,
        changeType: CollectionVariableElementChangeType,
        elementChanges: Nullable<object>)
    {
        super(key, originalElement, currentElement, changeType);
        this.elementChanges = elementChanges;
    }
}

class MutableCollectionVariableChanges<TKey, TElement>
    extends
    CollectionVariableChanges<TKey, TElement>
{
    public get currentValue(): IReadonlyKeyedCollection<TKey, TElement>
    {
        return reinterpretCast<IReadonlyKeyedCollection<TKey, TElement>>(this._currentValue);
    }
    public set currentValue(value: IReadonlyKeyedCollection<TKey, TElement>)
    {
        this._currentValue = value;
    }

    public get elements(): UnorderedMap<TKey, MutableCollectionVariableElementChange<TKey, TElement>>
    {
        return reinterpretCast<UnorderedMap<TKey, MutableCollectionVariableElementChange<TKey, TElement>>>(this._elements);
    }
    public set elements(value: UnorderedMap<TKey, MutableCollectionVariableElementChange<TKey, TElement>>)
    {
        this._elements = value;
    }

    private _currentValue: Nullable<IReadonlyKeyedCollection<TKey, TElement>>;
    private _elements: Nullable<UnorderedMap<TKey, MutableCollectionVariableElementChange<TKey, TElement>>>;

    public constructor()
    {
        super();
        this._currentValue = null;
        this._elements = null;
    }
}

export type CollectionVariableChangeTrackerParams<TElement = any> =
{
    readonly attach?: boolean;
    readonly listenToInternalChanges?: boolean;
    readonly originalValue?: Iterable<TElement>;
    elementEqualityComparer?(first: Ensured<DeepReadonly<TElement>>, second: Ensured<DeepReadonly<TElement>>): boolean;
};

export class CollectionVariableChangeTracker<TKey = any, TElement = any>
    extends
    VariableChangeTrackerBase<IReadonlyKeyedCollection<TKey, TElement>>
    implements
    ICollectionVariableChangeTracker<TKey, TElement>
{
    public get hasChanged(): boolean
    {
        return this._changes.elements.length > 0;
    }

    public get originalValue(): IReadonlyKeyedCollection<TKey, TElement>
    {
        Assert.False(isNull(this.linkedVariable), 'change tracker hasn\'t been configured');
        return this._getOriginalCollection();
    }

    public get changes(): CollectionVariableChanges<TKey, TElement>
    {
        return this._changes;
    }

    protected get linkedVariable(): Nullable<IReadonlyCollectionVariable<TKey, TElement>>
    {
        return reinterpretCast<Nullable<IReadonlyCollectionVariable<TKey, TElement>>>(super.linkedVariable);
    }

    public readonly isListeningToInternalChanges: boolean;

    protected readonly elementEqualityComparer:
        Undefinable<(first: Ensured<DeepReadonly<TElement>>, second: Ensured<DeepReadonly<TElement>>) => boolean>;

    private readonly _changes: MutableCollectionVariableChanges<TKey, TElement>;
    private readonly _collectionListeners: IEventListener[];

    private _elementChangeListeners: Nullable<UnorderedMap<TKey, IEventListener>>;
    private _originalValue: IReadonlyKeyedCollection<TKey, TElement> | Iterable<TElement>;

    public constructor(params?: CollectionVariableChangeTrackerParams<TElement>)
    {
        if (!isDefined(params))
            params = {};

        super(params.attach);

        this._collectionListeners = [];
        this._elementChangeListeners = null;
        this._originalValue = isDefined(params.originalValue) ? params.originalValue : [];
        this.isListeningToInternalChanges = isDefined(params.listenToInternalChanges) ? params.listenToInternalChanges : true;
        this._changes = new MutableCollectionVariableChanges<TKey, TElement>();
        this.elementEqualityComparer = params.elementEqualityComparer;
    }

    public dispose(): void
    {
        if (this.isDisposed)
            return;

        for (const listener of this._collectionListeners)
            listener.dispose();

        if (!isNull(this._elementChangeListeners))
        {
            for (const listener of this._elementChangeListeners.values())
                listener.dispose();

            this._elementChangeListeners.clear();
        }

        this._collectionListeners.splice(0);

        if (!isNull(this._changes.elements))
            this._changes.elements.clear();

        this._changes.currentValue = this._getOriginalCollection();
        super.dispose();
    }

    public configure(linkedVariable: IReadonlyCollectionVariable<TKey, TElement>): void
    {
        super.configure(linkedVariable);

        const originalValue = KeyedCollection.CloneSchema(linkedVariable.value, `original_${linkedVariable.value.name}`);
        originalValue.tryAddRange(reinterpretCast<Iterable<TElement>>(this._originalValue));
        this._originalValue = originalValue;

        this._changes.elements = new UnorderedMap<TKey, MutableCollectionVariableElementChange<TKey, TElement>>(
            linkedVariable.value.primaryLookup.keyStringifier);

        this._elementChangeListeners = new UnorderedMap<TKey, IEventListener>(
            linkedVariable.value.primaryLookup.keyStringifier);

        this._updateChanges(linkedVariable.value);

        this._collectionListeners.push(
            this._configureElementsAddedListener(),
            this._configureElementsRemovedListener(),
            this._configureElementsReplacedListener(),
            this._configureElementsSetListener(),
            this._configureCollectionRecreatedListener());
    }

    public detectChanges(): void
    {
        super.detectChanges();

        const changes = this._updateChanges(this.linkedVariable!.value);
        this._publishCollectionChange(changes, null);
    }

    public areEqual(first: IReadonlyKeyedCollection<TKey, TElement>, second: IReadonlyKeyedCollection<TKey, TElement>): boolean
    {
        if (first === second)
            return true;

        if (first.length !== second.length)
            return false;

        for (const entry of first)
        {
            const other = second.tryGet(entry.key);
            if (!this.areElementsEqual(toDeepReadonly(entry.value), toDeepReadonly(other)))
                return false;
        }
        return true;
    }

    public areElementsEqual(first: Nullable<DeepReadonly<TElement>>, second: Nullable<DeepReadonly<TElement>>): boolean
    {
        return first === second ||
        (
            isDefined(first) &&
            isDefined(second) &&
            !isUndefined(this.elementEqualityComparer) &&
            this.elementEqualityComparer(first!, second!)
        );
    }

    public getAddedElements(): Iterable<TElement>
    {
        return this._getChangesOfType(
            CollectionVariableElementChangeType.Added, c => reinterpretCast<TElement>(c.currentElement));
    }

    public getRemovedElements(): Iterable<TElement>
    {
        return this._getChangesOfType(
            CollectionVariableElementChangeType.Removed, c => reinterpretCast<TElement>(c.originalElement));
    }

    public getReplacedElements(): Iterable<UpdateRef<TElement>>
    {
        return this._getChangesOfType(
            CollectionVariableElementChangeType.Replaced,
            c => new UpdateRef<TElement>(reinterpretCast<TElement>(c.currentElement), reinterpretCast<TElement>(c.originalElement)));
    }

    public getChangedElements(): Iterable<TElement>
    {
        return this._getChangesOfType(
            CollectionVariableElementChangeType.Changed, c => reinterpretCast<TElement>(c.originalElement));
    }

    public getUnchagedElements(): Iterable<TElement>
    {
        return Iteration.Map(
            Iteration.Filter(this._getOriginalCollection(),
                e => !this._changes.elements.has(e.key)),
            e => e.value);
    }

    private _getChangesOfType<TResult>(
        type: CollectionVariableElementChangeType,
        resultSelector: (change: MutableCollectionVariableElementChange<TKey, TElement>) => TResult):
        Iterable<TResult>
    {
        return Iteration.Map(
            Iteration.Filter(this._changes.elements,
                e => e.value.changeType === type),
            e => resultSelector(e.value));
    }

    private _configureElementsAddedListener(): IEventListener
    {
        return this.linkedVariable!.onElementsAdded.listen((_, e) =>
        {
            if (!this.isAttached)
                return;

            const originalCollection = this._getOriginalCollection();
            const changes: MutableCollectionVariableElementChange<TKey, TElement>[] = [];

            for (const element of e!.addedElements)
            {
                const key = this._getElementKey(element);
                const originalElement = originalCollection.tryGet(key);

                const change = this._handleElementAttachment(key, element, originalElement);
                changes.push(change);
            }
            this._publishCollectionChange(changes, e!);
        });
    }

    private _configureElementsRemovedListener(): IEventListener
    {
        return this.linkedVariable!.onElementsRemoved.listen((_, e) =>
        {
            if (!this.isAttached)
                return;

            const originalCollection = this._getOriginalCollection();
            const changes: MutableCollectionVariableElementChange<TKey, TElement>[] = [];

            for (const element of e!.removedElements)
            {
                const key = this._getElementKey(element);
                const originalElement = originalCollection.tryGet(key);

                const change = this._handleElementDetachment(key, element, originalElement);
                changes.push(change);
            }
            this._publishCollectionChange(changes, e!);
        });
    }

    private _configureElementsReplacedListener(): IEventListener
    {
        return this.linkedVariable!.onElementsReplaced.listen((_, e) =>
        {
            if (!this.isAttached)
                return;

            const originalCollection = this._getOriginalCollection();
            const changes: MutableCollectionVariableElementChange<TKey, TElement>[] = [];

            for (const element of e!.replacedElements)
            {
                const key = this._getElementKey(element.value);
                const originalElement = originalCollection.tryGet(key);

                const change = this._handleElementAttachment(key, element.value, originalElement);
                changes.push(change);
            }
            this._publishCollectionChange(changes, e!);
        });
    }

    private _configureElementsSetListener(): IEventListener
    {
        return this.linkedVariable!.onElementsSet.listen((_, e) =>
        {
            if (!this.isAttached)
                return;

            const originalCollection = this._getOriginalCollection();
            const changes: MutableCollectionVariableElementChange<TKey, TElement>[] = [];

            for (const element of e!.addedElements)
            {
                const key = this._getElementKey(element);
                const originalElement = originalCollection.tryGet(key);

                const change = this._handleElementAttachment(key, element, originalElement);
                changes.push(change);
            }
            for (const element of e!.replacedElements)
            {
                const key = this._getElementKey(element.value);
                const originalElement = originalCollection.tryGet(key);

                const change = this._handleElementAttachment(key, element.value, originalElement);
                changes.push(change);
            }
            this._publishCollectionChange(changes, e!);
        });
    }

    private _configureCollectionRecreatedListener(): IEventListener
    {
        return this.linkedVariable!.onRecreated.listen((_, e) =>
            {
                if (!this.isAttached)
                    return;

                const changes = this._updateChanges(e!.currentValue);
                this._publishCollectionChange(changes, e!);
            });
    }

    private _updateChanges(
        currentValue: IReadonlyKeyedCollection<TKey, TElement>):
        MutableCollectionVariableElementChange<TKey, TElement>[]
    {
        this._changes.currentValue = currentValue;
        const originalCollection = this._getOriginalCollection();
        const changes: MutableCollectionVariableElementChange<TKey, TElement>[] = [];
        const addedElementsToRemove: MapEntry<TKey, TElement>[] = [];

        for (const entry of this._changes.elements)
        {
            const change = entry.value;
            if (change.changeType !== CollectionVariableElementChangeType.Added)
                continue;

            const key = entry.key;
            const existsInCurrentCollection = currentValue.hasKey(key);

            if (existsInCurrentCollection)
                continue;

            addedElementsToRemove.push(
                makeMapEntry(key, reinterpretCast<TElement>(change.currentElement)));
        }

        for (const entry of currentValue)
        {
            const key = entry.key;
            const element = entry.value;
            const originalElement = originalCollection.tryGet(key);
            const isCurrentlyChanged = this._changes.elements.has(key);

            const change = this._handleElementAttachment(key, element, originalElement);

            if (change.changeType !== CollectionVariableElementChangeType.RestoredAsExisting || isCurrentlyChanged)
                changes.push(change);
        }

        for (const entry of originalCollection)
        {
            const key = entry.key;
            const originalElement = entry.value;
            const existsInCurrentCollection = currentValue.hasKey(key);

            if (existsInCurrentCollection)
                continue;

            const currentChange = this._changes.elements.tryGet(key);
            const isAlreadyRemoved = !isNull(currentChange) && currentChange.changeType === CollectionVariableElementChangeType.Removed;

            if (isAlreadyRemoved)
                continue;

            const change = this._handleOriginalElementRemoval(key, originalElement);
            changes.push(change);
        }

        for (const entry of addedElementsToRemove)
        {
            const key = entry.key;
            const element = entry.value;

            const change = this._handleNonOriginalElementRestoration(key, element);
            changes.push(change);
        }
        return changes;
    }

    private _handleElementAttachment(
        key: DeepReadonly<TKey>,
        element: TElement,
        originalElement: Nullable<TElement>):
        MutableCollectionVariableElementChange<TKey, TElement>
    {
        if (isNull(originalElement))
            return this._handleNonOriginalElementAttachment(key, element);

        if (this.areElementsEqual(toDeepReadonly(originalElement), toDeepReadonly(element)))
            return this._handleOriginalElementAttachment(key, element, originalElement);

        return this._handleOriginalElementReplacement(key, element, originalElement);
    }

    private _handleNonOriginalElementAttachment(
        key: DeepReadonly<TKey>,
        element: TElement):
        MutableCollectionVariableElementChange<TKey, TElement>
    {
        const change = MutableCollectionVariableElementChange.CreateAdded(
            key, element, this._tryAddElementChangeListener(key, element));

        this._changes.elements.set(key, change);
        return change;
    }

    private _handleOriginalElementAttachment(
        key: DeepReadonly<TKey>,
        element: TElement,
        originalElement: TElement):
        MutableCollectionVariableElementChange<TKey, TElement>
    {
        const elementChanges = this._tryAddElementChangeListener(key, element);

        return isNull(elementChanges) ?
            this._handleOriginalElementRestoration(key, element, originalElement) :
            this._handleOriginalElementChange(key, element, originalElement, elementChanges);
    }

    private _handleOriginalElementRestoration(
        key: DeepReadonly<TKey>,
        element: TElement,
        originalElement: TElement):
        MutableCollectionVariableElementChange<TKey, TElement>
    {
        const change = MutableCollectionVariableElementChange.CreateRestoredAsExisting(
            key, originalElement, element);

        this._changes.elements.tryDelete(key);
        return change;
    }

    private _handleOriginalElementChange(
        key: DeepReadonly<TKey>,
        element: TElement,
        originalElement: TElement,
        elementChanges: object):
        MutableCollectionVariableElementChange<TKey, TElement>
    {
        const change = MutableCollectionVariableElementChange.CreateChanged(
            key, originalElement, element, elementChanges);

        this._changes.elements.set(key, change);
        return change;
    }

    private _handleOriginalElementReplacement(
        key: DeepReadonly<TKey>,
        element: TElement,
        originalElement: TElement):
        MutableCollectionVariableElementChange<TKey, TElement>
    {
        const change = MutableCollectionVariableElementChange.CreateReplaced(
            key, originalElement, element, this._tryAddElementChangeListener(key, element));

        this._changes.elements.set(key, change);
        return change;
    }

    private _handleElementDetachment(
        key: DeepReadonly<TKey>,
        element: TElement,
        originalElement: Nullable<TElement>):
        MutableCollectionVariableElementChange<TKey, TElement>
    {
        return isNull(originalElement) ?
            this._handleNonOriginalElementRestoration(key, element) :
            this._handleOriginalElementRemoval(key, originalElement);
    }

    private _handleNonOriginalElementRestoration(
        key: DeepReadonly<TKey>,
        element: TElement):
        MutableCollectionVariableElementChange<TKey, TElement>
    {
        this._tryDisposeElementChangeListener(key);
        this._changes.elements.tryDelete(key);

        const change = MutableCollectionVariableElementChange.CreateRestoredAsMissing(
            key, element);

        return change;
    }

    private _handleOriginalElementRemoval(
        key: DeepReadonly<TKey>,
        originalElement: TElement):
        MutableCollectionVariableElementChange<TKey, TElement>
    {
        this._tryDisposeElementChangeListener(key);

        const change = MutableCollectionVariableElementChange.CreateRemoved(
            key, originalElement);

        this._changes.elements.set(key, change);
        return change;
    }

    private _tryDisposeElementChangeListener(key: DeepReadonly<TKey>): void
    {
        const oldListener = this._elementChangeListeners!.tryGet(key);
        if (!isNull(oldListener))
        {
            oldListener.dispose();
            this._elementChangeListeners!.delete(key);
        }
    }

    private _tryAddElementChangeListener(key: DeepReadonly<TKey>, element: TElement): Nullable<object>
    {
        if (!this.isListeningToInternalChanges)
            return null;

        this._tryDisposeElementChangeListener(key);

        if (!isInstanceOfType(VariableBase, element))
            return null;

        const listener = element.changeTracker.onChange.listen((_, e) =>
            {
                if (!this.isAttached)
                    return;

                const tracker = element.changeTracker;
                let currentElementChanges = this._changes.elements.tryGet(key);

                if (isNull(currentElementChanges))
                {
                    const originalElement = this._getOriginalCollection().get(key);

                    currentElementChanges = tracker.hasChanged ?
                        this._handleOriginalElementChange(
                            key, element, originalElement, tracker.changes!) :
                        this._handleOriginalElementRestoration(
                            key, element, originalElement);
                }
                else if (
                    currentElementChanges.changeType !== CollectionVariableElementChangeType.Changed ||
                    tracker.hasChanged)
                    currentElementChanges.elementChanges = tracker.changes;
                else
                {
                    const originalElement = this._getOriginalCollection().get(key);
                    currentElementChanges = this._handleOriginalElementRestoration(
                        key, element, originalElement);
                }

                const event = new CollectionVariableElementChangeEvent<TKey, TElement>(
                    currentElementChanges, e!);

                this.publishChange(event);
            });

        this._elementChangeListeners!.set(key, listener);
        return element.changeTracker.changes;
    }

    private _getElementKey(element: TElement): DeepReadonly<TKey>
    {
        return this._changes.currentValue!.primaryLookup.getEntityKey(toDeepReadonly(element));
    }

    private _getOriginalCollection(): IReadonlyKeyedCollection<TKey, TElement>
    {
        return reinterpretCast<IReadonlyKeyedCollection<TKey, TElement>>(this._originalValue);
    }

    private _publishCollectionChange(
        changes: ReadonlyArray<MutableCollectionVariableElementChange<TKey, TElement>>,
        eventSource: Nullable<object>):
        void
    {
        const event = new CollectionVariableChangeEvent<TKey, TElement>(
            changes, eventSource);

        this.publishChange(event);
    }
}
