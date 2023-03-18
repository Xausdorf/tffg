var app = (function () {
	'use strict';

	function noop() {}

	function assign(tar, src) {
		for (const k in src) tar[k] = src[k];
		return tar;
	}

	function is_promise(value) {
		return value && typeof value.then === 'function';
	}

	function add_location(element, file, line, column, char) {
		element.__svelte_meta = {
			loc: { file, line, column, char }
		};
	}

	function run(fn) {
		return fn();
	}

	function blank_object() {
		return Object.create(null);
	}

	function run_all(fns) {
		fns.forEach(run);
	}

	function is_function(thing) {
		return typeof thing === 'function';
	}

	function safe_not_equal(a, b) {
		return a != a ? b == b : a !== b || ((a && typeof a === 'object') || typeof a === 'function');
	}

	function append(target, node) {
		target.appendChild(node);
	}

	function insert(target, node, anchor) {
		target.insertBefore(node, anchor);
	}

	function detach(node) {
		node.parentNode.removeChild(node);
	}

	function destroy_each(iterations, detaching) {
		for (let i = 0; i < iterations.length; i += 1) {
			if (iterations[i]) iterations[i].d(detaching);
		}
	}

	function element(name) {
		return document.createElement(name);
	}

	function text(data) {
		return document.createTextNode(data);
	}

	function space() {
		return text(' ');
	}

	function empty() {
		return text('');
	}

	function listen(node, event, handler, options) {
		node.addEventListener(event, handler, options);
		return () => node.removeEventListener(event, handler, options);
	}

	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else node.setAttribute(attribute, value);
	}

	function to_number(value) {
		return value === '' ? undefined : +value;
	}

	function children(element) {
		return Array.from(element.childNodes);
	}

	function set_data(text, data) {
		data = '' + data;
		if (text.data !== data) text.data = data;
	}

	function set_style(node, key, value) {
		node.style.setProperty(key, value);
	}

	let current_component;

	function set_current_component(component) {
		current_component = component;
	}

	const dirty_components = [];

	const resolved_promise = Promise.resolve();
	let update_scheduled = false;
	const binding_callbacks = [];
	const render_callbacks = [];
	const flush_callbacks = [];

	function schedule_update() {
		if (!update_scheduled) {
			update_scheduled = true;
			resolved_promise.then(flush);
		}
	}

	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	function flush() {
		const seen_callbacks = new Set();

		do {
			// first, call beforeUpdate functions
			// and update components
			while (dirty_components.length) {
				const component = dirty_components.shift();
				set_current_component(component);
				update(component.$$);
			}

			while (binding_callbacks.length) binding_callbacks.shift()();

			// then, once components are updated, call
			// afterUpdate functions. This may cause
			// subsequent updates...
			while (render_callbacks.length) {
				const callback = render_callbacks.pop();
				if (!seen_callbacks.has(callback)) {
					callback();

					// ...so guard against infinite loops
					seen_callbacks.add(callback);
				}
			}
		} while (dirty_components.length);

		while (flush_callbacks.length) {
			flush_callbacks.pop()();
		}

		update_scheduled = false;
	}

	function update($$) {
		if ($$.fragment) {
			$$.update($$.dirty);
			run_all($$.before_render);
			$$.fragment.p($$.dirty, $$.ctx);
			$$.dirty = null;

			$$.after_render.forEach(add_render_callback);
		}
	}

	let outros;

	function group_outros() {
		outros = {
			remaining: 0,
			callbacks: []
		};
	}

	function check_outros() {
		if (!outros.remaining) {
			run_all(outros.callbacks);
		}
	}

	function on_outro(callback) {
		outros.callbacks.push(callback);
	}

	function handle_promise(promise, info) {
		const token = info.token = {};

		function update(type, index, key, value) {
			if (info.token !== token) return;

			info.resolved = key && { [key]: value };

			const child_ctx = assign(assign({}, info.ctx), info.resolved);
			const block = type && (info.current = type)(child_ctx);

			if (info.block) {
				if (info.blocks) {
					info.blocks.forEach((block, i) => {
						if (i !== index && block) {
							group_outros();
							on_outro(() => {
								block.d(1);
								info.blocks[i] = null;
							});
							block.o(1);
							check_outros();
						}
					});
				} else {
					info.block.d(1);
				}

				block.c();
				if (block.i) block.i(1);
				block.m(info.mount(), info.anchor);

				flush();
			}

			info.block = block;
			if (info.blocks) info.blocks[index] = block;
		}

		if (is_promise(promise)) {
			promise.then(value => {
				update(info.then, 1, info.value, value);
			}, error => {
				update(info.catch, 2, info.error, error);
			});

			// if we previously had a then/catch block, destroy it
			if (info.current !== info.pending) {
				update(info.pending, 0);
				return true;
			}
		} else {
			if (info.current !== info.then) {
				update(info.then, 1, info.value, promise);
				return true;
			}

			info.resolved = { [info.value]: promise };
		}
	}

	function mount_component(component, target, anchor) {
		const { fragment, on_mount, on_destroy, after_render } = component.$$;

		fragment.m(target, anchor);

		// onMount happens after the initial afterUpdate. Because
		// afterUpdate callbacks happen in reverse order (inner first)
		// we schedule onMount callbacks before afterUpdate callbacks
		add_render_callback(() => {
			const new_on_destroy = on_mount.map(run).filter(is_function);
			if (on_destroy) {
				on_destroy.push(...new_on_destroy);
			} else {
				// Edge case - component was destroyed immediately,
				// most likely as a result of a binding initialising
				run_all(new_on_destroy);
			}
			component.$$.on_mount = [];
		});

		after_render.forEach(add_render_callback);
	}

	function destroy(component, detaching) {
		if (component.$$) {
			run_all(component.$$.on_destroy);
			component.$$.fragment.d(detaching);

			// TODO null out other refs, including component.$$ (but need to
			// preserve final state?)
			component.$$.on_destroy = component.$$.fragment = null;
			component.$$.ctx = {};
		}
	}

	function make_dirty(component, key) {
		if (!component.$$.dirty) {
			dirty_components.push(component);
			schedule_update();
			component.$$.dirty = {};
		}
		component.$$.dirty[key] = true;
	}

	function init(component, options, instance, create_fragment, not_equal$$1, prop_names) {
		const parent_component = current_component;
		set_current_component(component);

		const props = options.props || {};

		const $$ = component.$$ = {
			fragment: null,
			ctx: null,

			// state
			props: prop_names,
			update: noop,
			not_equal: not_equal$$1,
			bound: blank_object(),

			// lifecycle
			on_mount: [],
			on_destroy: [],
			before_render: [],
			after_render: [],
			context: new Map(parent_component ? parent_component.$$.context : []),

			// everything else
			callbacks: blank_object(),
			dirty: null
		};

		let ready = false;

		$$.ctx = instance
			? instance(component, props, (key, value) => {
				if ($$.ctx && not_equal$$1($$.ctx[key], $$.ctx[key] = value)) {
					if ($$.bound[key]) $$.bound[key](value);
					if (ready) make_dirty(component, key);
				}
			})
			: props;

		$$.update();
		ready = true;
		run_all($$.before_render);
		$$.fragment = create_fragment($$.ctx);

		if (options.target) {
			if (options.hydrate) {
				$$.fragment.l(children(options.target));
			} else {
				$$.fragment.c();
			}

			if (options.intro && component.$$.fragment.i) component.$$.fragment.i();
			mount_component(component, options.target, options.anchor);
			flush();
		}

		set_current_component(parent_component);
	}

	class SvelteComponent {
		$destroy() {
			destroy(this, true);
			this.$destroy = noop;
		}

		$on(type, callback) {
			const callbacks = (this.$$.callbacks[type] || (this.$$.callbacks[type] = []));
			callbacks.push(callback);

			return () => {
				const index = callbacks.indexOf(callback);
				if (index !== -1) callbacks.splice(index, 1);
			};
		}

		$set() {
			// overridden by instance, if it has props
		}
	}

	class SvelteComponentDev extends SvelteComponent {
		constructor(options) {
			if (!options || (!options.target && !options.$$inline)) {
				throw new Error(`'target' is a required option`);
			}

			super();
		}

		$destroy() {
			super.$destroy();
			this.$destroy = () => {
				console.warn(`Component was already destroyed`); // eslint-disable-line no-console
			};
		}
	}

	function writable(value, start = noop) {
		let stop;
		const subscribers = [];

		function set(new_value) {
			if (safe_not_equal(value, new_value)) {
				value = new_value;
				if (!stop) return; // not ready
				subscribers.forEach(s => s[1]());
				subscribers.forEach(s => s[0](value));
			}
		}

		function update(fn) {
			set(fn(value));
		}

		function subscribe(run, invalidate = noop) {
			const subscriber = [run, invalidate];
			subscribers.push(subscriber);
			if (subscribers.length === 1) stop = start(set) || noop;
			run(value);

			return () => {
				const index = subscribers.indexOf(subscriber);
				if (index !== -1) subscribers.splice(index, 1);
				if (subscribers.length === 0) stop();
			};
		}

		return { set, update, subscribe };
	}

	const hash = writable('');

	hashSetter();

	window.onhashchange = () => hashSetter();

	function hashSetter() {
	  hash.set(
	    location.hash.length >= 2 
	    ? location.hash.substring(2) 
	    : ''
	  );
	}

	/* src/app/component/GetList.svelte generated by Svelte v3.1.0 */

	const file = "src/app/component/GetList.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.element = list[i];
		return child_ctx;
	}

	// (52:0) {:catch error}
	function create_catch_block(ctx) {
		var small, t_value = ctx.error.message, t;

		return {
			c: function create() {
				small = element("small");
				t = text(t_value);
				small.className = "form-text text-danger";
				add_location(small, file, 52, 4, 1282);
			},

			m: function mount(target, anchor) {
				insert(target, small, anchor);
				append(small, t);
			},

			p: function update(changed, ctx) {
				if ((changed.promise) && t_value !== (t_value = ctx.error.message)) {
					set_data(t, t_value);
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(small);
				}
			}
		};
	}

	// (31:0) {:then response}
	function create_then_block(ctx) {
		var div;

		var each_value = ctx.response;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		return {
			c: function create() {
				div = element("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}
				div.className = "row row-cols-1 row-cols-md-3 g-4";
				add_location(div, file, 31, 1, 535);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div, null);
				}
			},

			p: function update(changed, ctx) {
				if (changed.promise) {
					each_value = ctx.response;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				destroy_each(each_blocks, detaching);
			}
		};
	}

	// (33:2) {#each response as element}
	function create_each_block(ctx) {
		var div4, div3, div1, div0, h5, t0_value = ctx.element.name, t0, t1, button, t2, p0, t3_value = ctx.element.email, t3, t4, p1, t5_value = ctx.element.phone, t5, t6, div2, p2, small0, t7, t8_value = ctx.element.joinDate, t8, t9, p3, small1, t10_value = ctx.element.id, t10, t11, dispose;

		function click_handler() {
			return ctx.click_handler(ctx);
		}

		return {
			c: function create() {
				div4 = element("div");
				div3 = element("div");
				div1 = element("div");
				div0 = element("div");
				h5 = element("h5");
				t0 = text(t0_value);
				t1 = space();
				button = element("button");
				t2 = space();
				p0 = element("p");
				t3 = text(t3_value);
				t4 = space();
				p1 = element("p");
				t5 = text(t5_value);
				t6 = space();
				div2 = element("div");
				p2 = element("p");
				small0 = element("small");
				t7 = text("joined at ");
				t8 = text(t8_value);
				t9 = space();
				p3 = element("p");
				small1 = element("small");
				t10 = text(t10_value);
				t11 = space();
				h5.className = "card-title";
				add_location(h5, file, 37, 6, 714);
				button.type = "button";
				button.className = "btn-close ms-auto";
				attr(button, "aria-label", "Close");
				add_location(button, file, 38, 6, 763);
				div0.className = "d-flex";
				add_location(div0, file, 36, 5, 687);
				p0.className = "card-text";
				add_location(p0, file, 40, 5, 915);
				p1.className = "card-text";
				add_location(p1, file, 41, 5, 961);
				div1.className = "card-body";
				add_location(div1, file, 35, 4, 658);
				small0.className = "text-muted";
				add_location(small0, file, 44, 26, 1069);
				p2.className = "card-text";
				add_location(p2, file, 44, 5, 1048);
				small1.className = "text-muted";
				add_location(small1, file, 45, 26, 1162);
				p3.className = "card-text";
				add_location(p3, file, 45, 5, 1141);
				div2.className = "card-footer";
				add_location(div2, file, 43, 4, 1017);
				div3.className = "card";
				add_location(div3, file, 34, 3, 635);
				div4.className = "col";
				add_location(div4, file, 33, 2, 614);
				dispose = listen(button, "click", click_handler);
			},

			m: function mount(target, anchor) {
				insert(target, div4, anchor);
				append(div4, div3);
				append(div3, div1);
				append(div1, div0);
				append(div0, h5);
				append(h5, t0);
				append(div0, t1);
				append(div0, button);
				append(div1, t2);
				append(div1, p0);
				append(p0, t3);
				append(div1, t4);
				append(div1, p1);
				append(p1, t5);
				append(div3, t6);
				append(div3, div2);
				append(div2, p2);
				append(p2, small0);
				append(small0, t7);
				append(small0, t8);
				append(div2, t9);
				append(div2, p3);
				append(p3, small1);
				append(small1, t10);
				append(div4, t11);
			},

			p: function update(changed, new_ctx) {
				ctx = new_ctx;
				if ((changed.promise) && t0_value !== (t0_value = ctx.element.name)) {
					set_data(t0, t0_value);
				}

				if ((changed.promise) && t3_value !== (t3_value = ctx.element.email)) {
					set_data(t3, t3_value);
				}

				if ((changed.promise) && t5_value !== (t5_value = ctx.element.phone)) {
					set_data(t5, t5_value);
				}

				if ((changed.promise) && t8_value !== (t8_value = ctx.element.joinDate)) {
					set_data(t8, t8_value);
				}

				if ((changed.promise) && t10_value !== (t10_value = ctx.element.id)) {
					set_data(t10, t10_value);
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div4);
				}

				dispose();
			}
		};
	}

	// (29:16)      <div class="spinner-border mt-3" role="status"></div> {:then response}
	function create_pending_block(ctx) {
		var div;

		return {
			c: function create() {
				div = element("div");
				div.className = "spinner-border mt-3";
				attr(div, "role", "status");
				add_location(div, file, 29, 4, 463);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
			},

			p: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}
			}
		};
	}

	function create_fragment(ctx) {
		var await_block_anchor, promise_1;

		let info = {
			ctx,
			current: null,
			pending: create_pending_block,
			then: create_then_block,
			catch: create_catch_block,
			value: 'response',
			error: 'error'
		};

		handle_promise(promise_1 = ctx.promise, info);

		return {
			c: function create() {
				await_block_anchor = empty();

				info.block.c();
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, await_block_anchor, anchor);

				info.block.m(target, info.anchor = anchor);
				info.mount = () => await_block_anchor.parentNode;
				info.anchor = await_block_anchor;
			},

			p: function update(changed, new_ctx) {
				ctx = new_ctx;
				info.ctx = ctx;

				if (('promise' in changed) && promise_1 !== (promise_1 = ctx.promise) && handle_promise(promise_1, info)) ; else {
					info.block.p(changed, assign(assign({}, ctx), info.resolved));
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(await_block_anchor);
				}

				info.block.d(detaching);
				info = null;
			}
		};
	}

	async function getList() {
	    const res = await fetch(`api/v1/donator`);
	const text = await res.json();

	if (res.ok) {
	  return text;
	} else {
	  throw text;
	}
	  }

	async function deleteDonator(id) {
	const res = await fetch(`api/v1/donator/${id}`, {
		method: 'DELETE'
	});

	if (!res.ok) 
		throw await res.json();
	  }

	function instance($$self, $$props, $$invalidate) {
		let promise = getList();

	  async function loadList() {
		$$invalidate('promise', promise = await getList());
	  }

		function click_handler({ element }) {
			return deleteDonator(element.id).then(loadList);
		}

		return { promise, loadList, click_handler };
	}

	class GetList extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, []);
		}
	}

	/* src/app/pages/Homepage.svelte generated by Svelte v3.1.0 */

	const file$1 = "src/app/pages/Homepage.svelte";

	function create_fragment$1(ctx) {
		var h1, t_1, current;

		var getlist = new GetList({ $$inline: true });

		return {
			c: function create() {
				h1 = element("h1");
				h1.textContent = "Home sweet Home";
				t_1 = space();
				getlist.$$.fragment.c();
				add_location(h1, file$1, 4, 0, 72);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, h1, anchor);
				insert(target, t_1, anchor);
				mount_component(getlist, target, anchor);
				current = true;
			},

			p: noop,

			i: function intro(local) {
				if (current) return;
				getlist.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				getlist.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(h1);
					detach(t_1);
				}

				getlist.$destroy(detaching);
			}
		};
	}

	class Homepage extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, null, create_fragment$1, safe_not_equal, []);
		}
	}

	/* src/app/pages/Notfound.svelte generated by Svelte v3.1.0 */

	const file$2 = "src/app/pages/Notfound.svelte";

	function create_fragment$2(ctx) {
		var h1;

		return {
			c: function create() {
				h1 = element("h1");
				h1.textContent = "Page not found";
				h1.className = "text-center";
				set_style(h1, "margin-top", "43vh");
				add_location(h1, file$2, 0, 0, 0);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, h1, anchor);
			},

			p: noop,
			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(h1);
				}
			}
		};
	}

	class Notfound extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, null, create_fragment$2, safe_not_equal, []);
		}
	}

	/* src/app/pages/Submit.svelte generated by Svelte v3.1.0 */

	const file$3 = "src/app/pages/Submit.svelte";

	// (54:4) {#if show}
	function create_if_block(ctx) {
		var await_block_anchor, promise_1;

		let info = {
			ctx,
			current: null,
			pending: create_pending_block$1,
			then: create_then_block$1,
			catch: create_catch_block$1,
			value: 'null',
			error: 'error'
		};

		handle_promise(promise_1 = ctx.promise, info);

		return {
			c: function create() {
				await_block_anchor = empty();

				info.block.c();
			},

			m: function mount(target, anchor) {
				insert(target, await_block_anchor, anchor);

				info.block.m(target, info.anchor = anchor);
				info.mount = () => await_block_anchor.parentNode;
				info.anchor = await_block_anchor;
			},

			p: function update(changed, new_ctx) {
				ctx = new_ctx;
				info.ctx = ctx;

				if (('promise' in changed) && promise_1 !== (promise_1 = ctx.promise) && handle_promise(promise_1, info)) ; else {
					info.block.p(changed, assign(assign({}, ctx), info.resolved));
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(await_block_anchor);
				}

				info.block.d(detaching);
				info = null;
			}
		};
	}

	// (59:8) {:catch error}
	function create_catch_block$1(ctx) {
		var small, t_value = ctx.error.message, t;

		return {
			c: function create() {
				small = element("small");
				t = text(t_value);
				small.className = "form-text text-danger";
				add_location(small, file$3, 59, 12, 1709);
			},

			m: function mount(target, anchor) {
				insert(target, small, anchor);
				append(small, t);
			},

			p: function update(changed, ctx) {
				if ((changed.promise) && t_value !== (t_value = ctx.error.message)) {
					set_data(t, t_value);
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(small);
				}
			}
		};
	}

	// (57:8) {:then}
	function create_then_block$1(ctx) {
		var small;

		return {
			c: function create() {
				small = element("small");
				small.textContent = "Успешно отправлено";
				small.className = "form-text text-success";
				add_location(small, file$3, 57, 12, 1609);
			},

			m: function mount(target, anchor) {
				insert(target, small, anchor);
			},

			p: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(small);
				}
			}
		};
	}

	// (55:24)              <div class="spinner-border mt-3" role="status"></div>         {:then}
	function create_pending_block$1(ctx) {
		var div;

		return {
			c: function create() {
				div = element("div");
				div.className = "spinner-border mt-3";
				attr(div, "role", "status");
				add_location(div, file$3, 55, 12, 1527);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
			},

			p: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}
			}
		};
	}

	function create_fragment$3(ctx) {
		var div5, h5, t1, div4, form_1, div0, label0, t3, input0, t4, div1, label1, t6, input1, t7, div2, label2, t9, input2, t10, div3, label3, t12, input3, t13, button, t15, dispose;

		var if_block = (ctx.show) && create_if_block(ctx);

		return {
			c: function create() {
				div5 = element("div");
				h5 = element("h5");
				h5.textContent = "Отправить деняк";
				t1 = space();
				div4 = element("div");
				form_1 = element("form");
				div0 = element("div");
				label0 = element("label");
				label0.textContent = "ФИО";
				t3 = space();
				input0 = element("input");
				t4 = space();
				div1 = element("div");
				label1 = element("label");
				label1.textContent = "Электронная почта";
				t6 = space();
				input1 = element("input");
				t7 = space();
				div2 = element("div");
				label2 = element("label");
				label2.textContent = "Номер телефона";
				t9 = space();
				input2 = element("input");
				t10 = space();
				div3 = element("div");
				label3 = element("label");
				label3.textContent = "Сумма пожертвования";
				t12 = space();
				input3 = element("input");
				t13 = space();
				button = element("button");
				button.textContent = "Отправить";
				t15 = space();
				if (if_block) if_block.c();
				h5.className = "card-header";
				add_location(h5, file$3, 31, 2, 624);
				add_location(label0, file$3, 35, 12, 753);
				attr(input0, "type", "text");
				input0.className = "form-control";
				add_location(input0, file$3, 36, 12, 784);
				div0.className = "form-group";
				add_location(div0, file$3, 34, 8, 716);
				add_location(label1, file$3, 39, 12, 910);
				attr(input1, "type", "email");
				input1.className = "form-control";
				add_location(input1, file$3, 40, 12, 955);
				div1.className = "form-group";
				add_location(div1, file$3, 38, 8, 873);
				add_location(label2, file$3, 43, 12, 1083);
				attr(input2, "type", "tel");
				input2.className = "form-control";
				add_location(input2, file$3, 44, 12, 1125);
				div2.className = "form-group";
				add_location(div2, file$3, 42, 8, 1046);
				add_location(label3, file$3, 47, 12, 1251);
				attr(input3, "type", "number");
				input3.className = "form-control";
				add_location(input3, file$3, 48, 12, 1298);
				div3.className = "form-group";
				add_location(div3, file$3, 46, 8, 1214);
				button.className = "btn btn-primary mt-3";
				add_location(button, file$3, 51, 8, 1389);
				add_location(form_1, file$3, 33, 4, 699);
				div4.className = "card-body";
				add_location(div4, file$3, 32, 2, 671);
				div5.className = "card";
				add_location(div5, file$3, 30, 0, 603);

				dispose = [
					listen(input0, "input", ctx.input0_input_handler),
					listen(input1, "input", ctx.input1_input_handler),
					listen(input2, "input", ctx.input2_input_handler),
					listen(input3, "input", ctx.input3_input_handler),
					listen(button, "click", ctx.submit)
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div5, anchor);
				append(div5, h5);
				append(div5, t1);
				append(div5, div4);
				append(div4, form_1);
				append(form_1, div0);
				append(div0, label0);
				append(div0, t3);
				append(div0, input0);

				input0.value = ctx.form.name;

				append(form_1, t4);
				append(form_1, div1);
				append(div1, label1);
				append(div1, t6);
				append(div1, input1);

				input1.value = ctx.form.email;

				append(form_1, t7);
				append(form_1, div2);
				append(div2, label2);
				append(div2, t9);
				append(div2, input2);

				input2.value = ctx.form.phone;

				append(form_1, t10);
				append(form_1, div3);
				append(div3, label3);
				append(div3, t12);
				append(div3, input3);

				input3.value = ctx.form.sum;

				append(form_1, t13);
				append(form_1, button);
				append(div4, t15);
				if (if_block) if_block.m(div4, null);
			},

			p: function update(changed, ctx) {
				if (changed.form && (input0.value !== ctx.form.name)) input0.value = ctx.form.name;
				if (changed.form) input1.value = ctx.form.email;
				if (changed.form) input2.value = ctx.form.phone;
				if (changed.form) input3.value = ctx.form.sum;

				if (ctx.show) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block(ctx);
						if_block.c();
						if_block.m(div4, null);
					}
				} else if (if_block) {
					if_block.d(1);
					if_block = null;
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div5);
				}

				if (if_block) if_block.d();
				run_all(dispose);
			}
		};
	}

	function instance$1($$self, $$props, $$invalidate) {
		let form = {
	        name: '',
	        email: '',
	        phone: '',
	        sum: 0
	    };

	    async function submitForm() {
	        const res = await fetch(`api/v1/donator`, {
	            method: 'POST',
	            headers: {
	                'Accept': 'application/json',
	                'Content-Type': 'application/json'
	            },
	            body: JSON.stringify(form)
	        });
	        if (!res.ok)
	            throw await res.json();
	    }

	    let promise;
	    let show = false;

	    function submit() {
	        $$invalidate('show', show = true);
	        $$invalidate('promise', promise = submitForm());
	    }

		function input0_input_handler() {
			form.name = this.value;
			$$invalidate('form', form);
		}

		function input1_input_handler() {
			form.email = this.value;
			$$invalidate('form', form);
		}

		function input2_input_handler() {
			form.phone = this.value;
			$$invalidate('form', form);
		}

		function input3_input_handler() {
			form.sum = to_number(this.value);
			$$invalidate('form', form);
		}

		return {
			form,
			promise,
			show,
			submit,
			input0_input_handler,
			input1_input_handler,
			input2_input_handler,
			input3_input_handler
		};
	}

	class Submit extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$3, safe_not_equal, []);
		}
	}

	/* src/app/routing/Router.svelte generated by Svelte v3.1.0 */

	const file$4 = "src/app/routing/Router.svelte";

	function create_fragment$4(ctx) {
		var main, current;

		var switch_value = ctx.value;

		function switch_props(ctx) {
			return { $$inline: true };
		}

		if (switch_value) {
			var switch_instance = new switch_value(switch_props(ctx));
		}

		return {
			c: function create() {
				main = element("main");
				if (switch_instance) switch_instance.$$.fragment.c();
				main.className = "svelte-1arjn8m";
				add_location(main, file$4, 31, 0, 605);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, main, anchor);

				if (switch_instance) {
					mount_component(switch_instance, main, null);
				}

				current = true;
			},

			p: function update(changed, ctx) {
				if (switch_value !== (switch_value = ctx.value)) {
					if (switch_instance) {
						group_outros();
						const old_component = switch_instance;
						on_outro(() => {
							old_component.$destroy();
						});
						old_component.$$.fragment.o(1);
						check_outros();
					}

					if (switch_value) {
						switch_instance = new switch_value(switch_props(ctx));

						switch_instance.$$.fragment.c();
						switch_instance.$$.fragment.i(1);
						mount_component(switch_instance, main, null);
					} else {
						switch_instance = null;
					}
				}
			},

			i: function intro(local) {
				if (current) return;
				if (switch_instance) switch_instance.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				if (switch_instance) switch_instance.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(main);
				}

				if (switch_instance) switch_instance.$destroy();
			}
		};
	}

	function instance$2($$self, $$props, $$invalidate) {
		

	  let value = Notfound;

	  hash.subscribe( valu => {
	    switch(valu) {
	      case '':
	        $$invalidate('value', value = Homepage);
	        break;
	      case 'submit':
	        $$invalidate('value', value = Submit);
	        break;
	      default:
	        $$invalidate('value', value = Notfound);
	    }
	  });

		return { value };
	}

	class Router extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$2, create_fragment$4, safe_not_equal, []);
		}
	}

	/* src/app/component/Navbar.svelte generated by Svelte v3.1.0 */

	const file$5 = "src/app/component/Navbar.svelte";

	function create_fragment$5(ctx) {
		var nav, div1, a0, t1, button, span, t2, div0, ul, li0, a1, t4, li1, a2;

		return {
			c: function create() {
				nav = element("nav");
				div1 = element("div");
				a0 = element("a");
				a0.textContent = "tffg";
				t1 = space();
				button = element("button");
				span = element("span");
				t2 = space();
				div0 = element("div");
				ul = element("ul");
				li0 = element("li");
				a1 = element("a");
				a1.textContent = "Home";
				t4 = space();
				li1 = element("li");
				a2 = element("a");
				a2.textContent = "Submit";
				a0.className = "navbar-brand";
				a0.href = "#/";
				add_location(a0, file$5, 2, 4, 96);
				span.className = "navbar-toggler-icon";
				add_location(span, file$5, 4, 6, 328);
				button.className = "navbar-toggler";
				button.type = "button";
				button.dataset.bsToggle = "collapse";
				button.dataset.bsTarget = "#navbarNav";
				attr(button, "aria-controls", "navbarNav");
				attr(button, "aria-expanded", "false");
				attr(button, "aria-label", "Toggle navigation");
				add_location(button, file$5, 3, 4, 143);
				a1.className = "nav-link active";
				attr(a1, "aria-current", "page");
				a1.href = "#/";
				add_location(a1, file$5, 9, 10, 512);
				li0.className = "nav-item";
				add_location(li0, file$5, 8, 8, 480);
				a2.className = "nav-link";
				a2.href = "#/submit";
				add_location(a2, file$5, 12, 10, 632);
				li1.className = "nav-item";
				add_location(li1, file$5, 11, 8, 600);
				ul.className = "navbar-nav";
				add_location(ul, file$5, 7, 6, 448);
				div0.className = "collapse navbar-collapse";
				div0.id = "navbarNav";
				add_location(div0, file$5, 6, 4, 388);
				div1.className = "container-fluid";
				add_location(div1, file$5, 1, 2, 62);
				nav.className = "navbar navbar-expand-lg navbar-light bg-light";
				add_location(nav, file$5, 0, 0, 0);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, nav, anchor);
				append(nav, div1);
				append(div1, a0);
				append(div1, t1);
				append(div1, button);
				append(button, span);
				append(div1, t2);
				append(div1, div0);
				append(div0, ul);
				append(ul, li0);
				append(li0, a1);
				append(ul, t4);
				append(ul, li1);
				append(li1, a2);
			},

			p: noop,
			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(nav);
				}
			}
		};
	}

	class Navbar extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, null, create_fragment$5, safe_not_equal, []);
		}
	}

	/* src/App.svelte generated by Svelte v3.1.0 */

	const file$6 = "src/App.svelte";

	function create_fragment$6(ctx) {
		var div, t, current;

		var navbar = new Navbar({ $$inline: true });

		var router = new Router({ $$inline: true });

		return {
			c: function create() {
				div = element("div");
				navbar.$$.fragment.c();
				t = space();
				router.$$.fragment.c();
				div.className = "app-shell svelte-hrds2b";
				add_location(div, file$6, 15, 0, 239);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				mount_component(navbar, div, null);
				append(div, t);
				mount_component(router, div, null);
				current = true;
			},

			p: noop,

			i: function intro(local) {
				if (current) return;
				navbar.$$.fragment.i(local);

				router.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				navbar.$$.fragment.o(local);
				router.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				navbar.$destroy();

				router.$destroy();
			}
		};
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, null, create_fragment$6, safe_not_equal, []);
		}
	}

	const app = new App({
		target: document.body.querySelector('#app')
	});

	return app;

}());
//# sourceMappingURL=bundle.js.map
