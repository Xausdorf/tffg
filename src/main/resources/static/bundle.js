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

	function prevent_default(fn) {
		return function(event) {
			event.preventDefault();
			return fn.call(this, event);
		};
	}

	function attr(node, attribute, value) {
		if (value == null) node.removeAttribute(attribute);
		else node.setAttribute(attribute, value);
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

	function select_option(select, value) {
		for (let i = 0; i < select.options.length; i += 1) {
			const option = select.options[i];

			if (option.__value === value) {
				option.selected = true;
				return;
			}
		}
	}

	function select_value(select) {
		const selected_option = select.querySelector(':checked') || select.options[0];
		return selected_option && selected_option.__value;
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

	function add_binding_callback(fn) {
		binding_callbacks.push(fn);
	}

	function add_render_callback(fn) {
		render_callbacks.push(fn);
	}

	function add_flush_callback(fn) {
		flush_callbacks.push(fn);
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

	function bind(component, name, callback) {
		if (component.$$.props.indexOf(name) === -1) return;
		component.$$.bound[name] = callback;
		callback(component.$$.ctx[name]);
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

	const blockMain = writable(false);

	/* src/app/component/Form.svelte generated by Svelte v3.1.0 */

	const file = "src/app/component/Form.svelte";

	// (63:4) {#if show}
	function create_if_block(ctx) {
		var await_block_anchor, promise_1;

		let info = {
			ctx,
			current: null,
			pending: create_pending_block,
			then: create_then_block,
			catch: create_catch_block,
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

	// (68:6) {:catch error}
	function create_catch_block(ctx) {
		var small, t_value = ctx.error.message, t;

		return {
			c: function create() {
				small = element("small");
				t = text(t_value);
				small.className = "form-text text-danger";
				add_location(small, file, 68, 8, 2223);
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

	// (66:6) {:then}
	function create_then_block(ctx) {
		var small;

		return {
			c: function create() {
				small = element("small");
				small.textContent = "Успешно отправлено";
				small.className = "form-text text-success";
				add_location(small, file, 66, 8, 2129);
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

	// (64:22)          <div class="spinner-border mt-3" role="status" />       {:then}
	function create_pending_block(ctx) {
		var div;

		return {
			c: function create() {
				div = element("div");
				div.className = "spinner-border mt-3";
				attr(div, "role", "status");
				add_location(div, file, 64, 8, 2057);
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
		var div0, p, t1, div6, div5, form_1, div1, label0, t3, input0, t4, div2, label1, t6, input1, t7, div3, label2, t9, input2, t10, div4, label3, t12, select, option0, option1, option2, t16, button, t17, button_disabled_value, t18, dispose;

		var if_block = (ctx.show) && create_if_block(ctx);

		return {
			c: function create() {
				div0 = element("div");
				p = element("p");
				p.textContent = "Стать меценатом";
				t1 = space();
				div6 = element("div");
				div5 = element("div");
				form_1 = element("form");
				div1 = element("div");
				label0 = element("label");
				label0.textContent = "ФИО";
				t3 = space();
				input0 = element("input");
				t4 = space();
				div2 = element("div");
				label1 = element("label");
				label1.textContent = "Электронная почта";
				t6 = space();
				input1 = element("input");
				t7 = space();
				div3 = element("div");
				label2 = element("label");
				label2.textContent = "Номер телефона";
				t9 = space();
				input2 = element("input");
				t10 = space();
				div4 = element("div");
				label3 = element("label");
				label3.textContent = "Выберите уровень подписки";
				t12 = space();
				select = element("select");
				option0 = element("option");
				option0.textContent = "BRONZE";
				option1 = element("option");
				option1.textContent = "SILVER";
				option2 = element("option");
				option2.textContent = "GOLD";
				t16 = space();
				button = element("button");
				t17 = text("Отправить");
				t18 = space();
				if (if_block) if_block.c();
				p.className = "section-title text-center";
				add_location(p, file, 31, 2, 597);
				div0.className = "mx-auto col-8 d-flex justify-content-center align-items-center";
				add_location(div0, file, 30, 0, 518);
				label0.className = "form-label";
				add_location(label0, file, 38, 8, 856);
				attr(input0, "type", "text");
				input0.className = "form-control rounded-pill";
				add_location(input0, file, 39, 8, 902);
				div1.className = "form-group mb-3";
				add_location(div1, file, 37, 6, 818);
				label1.className = "form-label";
				add_location(label1, file, 42, 8, 1038);
				attr(input1, "type", "email");
				input1.className = "form-control rounded-pill";
				add_location(input1, file, 43, 8, 1098);
				div2.className = "form-group mb-3";
				add_location(div2, file, 41, 6, 1000);
				label2.className = "form-label";
				add_location(label2, file, 46, 8, 1236);
				attr(input2, "type", "tel");
				input2.className = "form-control rounded-pill";
				add_location(input2, file, 47, 8, 1293);
				div3.className = "form-group mb-3";
				add_location(div3, file, 45, 6, 1198);
				label3.className = "form-label";
				add_location(label3, file, 50, 8, 1429);
				option0.selected = "selected";
				option0.__value = "1";
				option0.value = option0.__value;
				set_style(option0, "color", "#C07825");
				add_location(option0, file, 54, 10, 1611);
				option1.__value = "2";
				option1.value = option1.__value;
				set_style(option1, "color", "#667581");
				add_location(option1, file, 55, 10, 1698);
				option2.__value = "3";
				option2.value = option2.__value;
				set_style(option2, "color", "#D7B642");
				add_location(option2, file, 56, 10, 1765);
				if (ctx.form.level === void 0) add_render_callback(() => ctx.select_change_handler.call(select));
				select.className = "custom-select rounded-pill";
				select.id = "form-select";
				add_location(select, file, 51, 8, 1497);
				div4.className = "form-group mb-3";
				add_location(div4, file, 49, 6, 1391);
				button.disabled = button_disabled_value = ctx.form.level == 0 || !ctx.form.name || !ctx.form.phone || !ctx.form.email;
				button.type = "submit";
				button.className = "btn btn-primary mt-3";
				add_location(button, file, 60, 6, 1858);
				add_location(form_1, file, 36, 4, 765);
				div5.className = "card-body";
				add_location(div5, file, 35, 2, 737);
				div6.className = "card col-6 my-5 mx-auto";
				set_style(div6, "background-color", "#e5eff3");
				add_location(div6, file, 34, 0, 662);

				dispose = [
					listen(input0, "input", ctx.input0_input_handler),
					listen(input1, "input", ctx.input1_input_handler),
					listen(input2, "input", ctx.input2_input_handler),
					listen(select, "change", ctx.select_change_handler),
					listen(form_1, "submit", prevent_default(ctx.handleSubmit))
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div0, anchor);
				append(div0, p);
				insert(target, t1, anchor);
				insert(target, div6, anchor);
				append(div6, div5);
				append(div5, form_1);
				append(form_1, div1);
				append(div1, label0);
				append(div1, t3);
				append(div1, input0);

				input0.value = ctx.form.name;

				append(form_1, t4);
				append(form_1, div2);
				append(div2, label1);
				append(div2, t6);
				append(div2, input1);

				input1.value = ctx.form.email;

				append(form_1, t7);
				append(form_1, div3);
				append(div3, label2);
				append(div3, t9);
				append(div3, input2);

				input2.value = ctx.form.phone;

				append(form_1, t10);
				append(form_1, div4);
				append(div4, label3);
				append(div4, t12);
				append(div4, select);
				append(select, option0);
				append(select, option1);
				append(select, option2);

				select_option(select, ctx.form.level);

				append(form_1, t16);
				append(form_1, button);
				append(button, t17);
				append(div5, t18);
				if (if_block) if_block.m(div5, null);
			},

			p: function update(changed, ctx) {
				if (changed.form && (input0.value !== ctx.form.name)) input0.value = ctx.form.name;
				if (changed.form) input1.value = ctx.form.email;
				if (changed.form) input2.value = ctx.form.phone;
				if (changed.form) select_option(select, ctx.form.level);

				if ((changed.form) && button_disabled_value !== (button_disabled_value = ctx.form.level == 0 || !ctx.form.name || !ctx.form.phone || !ctx.form.email)) {
					button.disabled = button_disabled_value;
				}

				if (ctx.show) {
					if (if_block) {
						if_block.p(changed, ctx);
					} else {
						if_block = create_if_block(ctx);
						if_block.c();
						if_block.m(div5, null);
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
					detach(div0);
					detach(t1);
					detach(div6);
				}

				if (if_block) if_block.d();
				run_all(dispose);
			}
		};
	}

	function instance($$self, $$props, $$invalidate) {
		let { form = {
	    name: "",
	    email: "",
	    phone: "",
	    level: 0,
	  } } = $$props;

	  async function submitForm() {
	    const res = await fetch(`api/v1/donator`, {
	      method: "POST",
	      headers: {
	        Accept: "application/json",
	        "Content-Type": "application/json",
	      },
	      body: JSON.stringify(form),
	    });
	    if (!res.ok) throw await res.json();
	  }

	  let promise;
	  let show = false;

	  function handleSubmit() {
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

		function select_change_handler() {
			form.level = select_value(this);
			$$invalidate('form', form);
		}

		$$self.$set = $$props => {
			if ('form' in $$props) $$invalidate('form', form = $$props.form);
		};

		return {
			form,
			promise,
			show,
			handleSubmit,
			input0_input_handler,
			input1_input_handler,
			input2_input_handler,
			select_change_handler
		};
	}

	class Form extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance, create_fragment, safe_not_equal, ["form"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.form === undefined && !('form' in props)) {
				console.warn("<Form> was created without expected prop 'form'");
			}
		}

		get form() {
			throw new Error("<Form>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set form(value) {
			throw new Error("<Form>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/app/pages/Homepage.svelte generated by Svelte v3.1.0 */

	const file$1 = "src/app/pages/Homepage.svelte";

	function get_each_context(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.project = list[i];
		return child_ctx;
	}

	function get_each_context_1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.task = list[i];
		return child_ctx;
	}

	// (145:6) {#each tasks as task}
	function create_each_block_1(ctx) {
		var div2, img, img_src_value, t, div1, div0, raw_value = ctx.task.task;

		return {
			c: function create() {
				div2 = element("div");
				img = element("img");
				t = space();
				div1 = element("div");
				div0 = element("div");
				img.className = "col-4 col-md-2";
				img.src = img_src_value = "pictures/" + ctx.task.pic;
				img.alt = "task picture";
				add_location(img, file$1, 146, 10, 4820);
				add_location(div0, file$1, 155, 12, 5089);
				div1.className = "col-8 col-md-10 align-items-center d-flex task-task";
				set_style(div1, "overflow", "auto");
				add_location(div1, file$1, 151, 10, 4952);
				div2.className = "w-100 row align-items-center p-3";
				add_location(div2, file$1, 145, 8, 4763);
			},

			m: function mount(target, anchor) {
				insert(target, div2, anchor);
				append(div2, img);
				append(div2, t);
				append(div2, div1);
				append(div1, div0);
				div0.innerHTML = raw_value;
			},

			p: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(div2);
				}
			}
		};
	}

	// (170:6) {#each projects as project}
	function create_each_block(ctx) {
		var div2, div1, div0, p0, t0_value = ctx.project.title, t0, t1, p1, t2_value = ctx.project.desc, t2, t3, a, span, a_href_value;

		return {
			c: function create() {
				div2 = element("div");
				div1 = element("div");
				div0 = element("div");
				p0 = element("p");
				t0 = text(t0_value);
				t1 = space();
				p1 = element("p");
				t2 = text(t2_value);
				t3 = space();
				a = element("a");
				span = element("span");
				span.textContent = ">";
				set_style(p0, "font-weight", "600");
				set_style(p0, "padding-right", "60px");
				add_location(p0, file$1, 178, 14, 5931);
				add_location(p1, file$1, 181, 14, 6047);
				div0.className = "position-absolute h-100 p-3 p-md-4 d-flex flex-column justify-content-between";
				add_location(div0, file$1, 175, 12, 5798);
				add_location(span, file$1, 184, 14, 6164);
				a.className = "position-absolute";
				a.href = a_href_value = ctx.project.href;
				add_location(a, file$1, 183, 12, 6100);
				set_style(div1, "background-image", "url(pictures/" + ctx.project.pic + ")");
				set_style(div1, "padding-bottom", "100%");
				set_style(div1, "min-height", "auto");
				div1.className = "position-relative project-card rounded";
				add_location(div1, file$1, 171, 10, 5603);
				div2.className = "col-12 col-sm-6 col-md-4 px-2 pb-2 pb-md-3";
				add_location(div2, file$1, 170, 8, 5536);
			},

			m: function mount(target, anchor) {
				insert(target, div2, anchor);
				append(div2, div1);
				append(div1, div0);
				append(div0, p0);
				append(p0, t0);
				append(div0, t1);
				append(div0, p1);
				append(p1, t2);
				append(div1, t3);
				append(div1, a);
				append(a, span);
			},

			p: function update(changed, ctx) {
				if (changed.projects) {
					set_style(div1, "background-image", "url(pictures/" + ctx.project.pic + ")");
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div2);
				}
			}
		};
	}

	function create_fragment$1(ctx) {
		var section0, div1, div0, h10, t1, a0, t3, section1, div7, div6, div5, div2, t5, div3, t6, div4, t8, img, t9, div8, t10, section2, div11, div9, p0, t12, div10, t13, section3, div14, div12, p1, t15, div13, t16, section4, div33, div15, p2, t18, div16, h5, t20, div32, div21, div19, div17, t22, div18, h11, t24, ul0, li0, t26, li1, t28, li2, t30, li3, t32, div20, a1, t34, div26, div24, div22, t36, div23, h12, t38, ul1, li4, t40, li5, t42, li6, t44, div25, a2, t46, div31, div29, div27, t48, div28, h13, t50, ul2, li7, t52, li8, t54, li9, t56, li10, t58, div30, a3, t60, section5, div34, updating_form, current, dispose;

		var each_value_1 = tasks;

		var each_blocks_1 = [];

		for (var i = 0; i < each_value_1.length; i += 1) {
			each_blocks_1[i] = create_each_block_1(get_each_context_1(ctx, each_value_1, i));
		}

		var each_value = projects;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block(get_each_context(ctx, each_value, i));
		}

		function form_1_form_binding(value) {
			ctx.form_1_form_binding.call(null, value);
			updating_form = true;
			add_flush_callback(() => updating_form = false);
		}

		let form_1_props = {};
		if (form !== void 0) {
			form_1_props.form = form;
		}
		var form_1 = new Form({ props: form_1_props, $$inline: true });

		add_binding_callback(() => bind(form_1, 'form', form_1_form_binding));

		return {
			c: function create() {
				section0 = element("section");
				div1 = element("div");
				div0 = element("div");
				h10 = element("h1");
				h10.textContent = "Созидаем будущее вместе!";
				t1 = space();
				a0 = element("a");
				a0.textContent = "Хочу помочь!";
				t3 = space();
				section1 = element("section");
				div7 = element("div");
				div6 = element("div");
				div5 = element("div");
				div2 = element("div");
				div2.textContent = "О фонде";
				t5 = space();
				div3 = element("div");
				t6 = space();
				div4 = element("div");
				div4.textContent = "Решение о создании Целевого фонда будущих поколений Республики Саха\n          (Якутия) принято на основании Распоряжения Президента Российской\n          Федерации от 12 октября 1992 года и Указа Президента Республики Саха\n          (Якутия) от 29 октября 1992 года № 278.";
				t8 = space();
				img = element("img");
				t9 = space();
				div8 = element("div");
				t10 = space();
				section2 = element("section");
				div11 = element("div");
				div9 = element("div");
				p0 = element("p");
				p0.textContent = "Задачи";
				t12 = space();
				div10 = element("div");

				for (var i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].c();
				}

				t13 = space();
				section3 = element("section");
				div14 = element("div");
				div12 = element("div");
				p1 = element("p");
				p1.textContent = "Действующие Проекты";
				t15 = space();
				div13 = element("div");

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				t16 = space();
				section4 = element("section");
				div33 = element("div");
				div15 = element("div");
				p2 = element("p");
				p2.textContent = "Как помочь фонду?";
				t18 = space();
				div16 = element("div");
				h5 = element("h5");
				h5.textContent = "Станьте членом сообщества неравнодушных к будущему Якутии, став\n        жертвователем ежегодным членским взносом.";
				t20 = space();
				div32 = element("div");
				div21 = element("div");
				div19 = element("div");
				div17 = element("div");
				div17.textContent = "BRONZE";
				t22 = space();
				div18 = element("div");
				h11 = element("h1");
				h11.textContent = "200₽/мес.";
				t24 = space();
				ul0 = element("ul");
				li0 = element("li");
				li0.textContent = "Именное упоминание на странице \"Благодарности\" на сайте";
				t26 = space();
				li1 = element("li");
				li1.textContent = "Приглашение на закрытые мероприятия, организованные фондом";
				t28 = space();
				li2 = element("li");
				li2.textContent = "Отправка регулярных новостей о проделанной работе и достижениях фонда";
				t30 = space();
				li3 = element("li");
				li3.textContent = "Отправка подарочных открыток и сувениров";
				t32 = space();
				div20 = element("div");
				a1 = element("a");
				a1.textContent = "Оформить";
				t34 = space();
				div26 = element("div");
				div24 = element("div");
				div22 = element("div");
				div22.textContent = "SILVER";
				t36 = space();
				div23 = element("div");
				h12 = element("h1");
				h12.textContent = "1000₽/мес.";
				t38 = space();
				ul1 = element("ul");
				li4 = element("li");
				li4.textContent = "Все привилегии, перечисленные в BRONZE";
				t40 = space();
				li5 = element("li");
				li5.textContent = "Возможность посетить одно из мероприятий, организованных фондом";
				t42 = space();
				li6 = element("li");
				li6.textContent = "Участие в программе лояльности, которая дает скидки на участие в мероприятиях или на приобретение сувениров";
				t44 = space();
				div25 = element("div");
				a2 = element("a");
				a2.textContent = "Оформить";
				t46 = space();
				div31 = element("div");
				div29 = element("div");
				div27 = element("div");
				div27.textContent = "GOLD";
				t48 = space();
				div28 = element("div");
				h13 = element("h1");
				h13.textContent = "5000₽/мес.";
				t50 = space();
				ul2 = element("ul");
				li7 = element("li");
				li7.textContent = "Все привилегии, перечисленные в SILVER";
				t52 = space();
				li8 = element("li");
				li8.textContent = "Возможность посетить несколько мероприятий, организованных фондом";
				t54 = space();
				li9 = element("li");
				li9.textContent = "Возможность внести предложения по работе фонда и получить ответы от руководства";
				t56 = space();
				li10 = element("li");
				li10.textContent = "Возможность участвовать в консультациях и вебинарах, проводимых фондом для меценатов";
				t58 = space();
				div30 = element("div");
				a3 = element("a");
				a3.textContent = "Оформить";
				t60 = space();
				section5 = element("section");
				div34 = element("div");
				form_1.$$.fragment.c();
				h10.className = "section-title text-white text-center mb-5";
				add_location(h10, file$1, 92, 6, 3004);
				a0.className = "btn rounded-pill py-3 px-5 text-white";
				set_style(a0, "background-color", "#ff7c3b");
				a0.href = "#section5";
				attr(a0, "role", "button");
				add_location(a0, file$1, 95, 6, 3110);
				div0.className = "mx-auto col-8 h-100 d-flex flex-column justify-content-center align-items-center";
				add_location(div0, file$1, 89, 4, 2892);
				div1.className = "mx-auto col-10 h-100";
				add_location(div1, file$1, 88, 2, 2853);
				section0.className = "container-fluid section1 bg-tint";
				section0.id = "section1";
				add_location(section0, file$1, 87, 0, 2786);
				div2.className = "section-title";
				add_location(div2, file$1, 113, 8, 3655);
				set_style(div3, "width", "100px");
				set_style(div3, "height", "6px");
				set_style(div3, "background", "#212529");
				div3.className = "mt-3 mb-4";
				add_location(div3, file$1, 114, 8, 3704);
				set_style(div4, "font-size", "20px");
				add_location(div4, file$1, 118, 8, 3822);
				div5.className = "text-wrapper";
				add_location(div5, file$1, 112, 6, 3620);
				div6.className = "col-12 col-md-5 mb-4 mb-md-0 d-flex flex-column justify-content-center align-items-center";
				add_location(div6, file$1, 109, 4, 3499);
				img.src = "pictures/fond_picture.jpg";
				img.className = "col-12 col-md-6 offset-md-1";
				img.alt = "foundation logo";
				add_location(img, file$1, 126, 4, 4178);
				div7.className = "mx-auto col-10 d-flex flex-wrap align-items-center";
				add_location(div7, file$1, 108, 2, 3430);
				section1.className = "container-fluid section2";
				section1.id = "section2";
				add_location(section1, file$1, 107, 0, 3371);
				div8.className = "col-10 mx-auto my-4";
				set_style(div8, "background", "#cbcbcb");
				set_style(div8, "height", "1px");
				add_location(div8, file$1, 134, 0, 4319);
				p0.className = "section-title text-center";
				add_location(p0, file$1, 139, 6, 4573);
				div9.className = "mx-auto col-8 d-flex justify-content-center align-items-center";
				add_location(div9, file$1, 138, 4, 4490);
				div10.className = "container-fluid align-items-center d-inline-flex flex-column mt-4";
				add_location(div10, file$1, 141, 4, 4636);
				div11.className = "mx-auto col-10";
				add_location(div11, file$1, 137, 2, 4457);
				section2.className = "container-fluid section3";
				section2.id = "section3";
				add_location(section2, file$1, 136, 0, 4398);
				p1.className = "section-title text-center";
				add_location(p1, file$1, 166, 6, 5371);
				div12.className = "mx-auto col-8 d-flex justify-content-center align-items-center";
				add_location(div12, file$1, 165, 4, 5288);
				div13.className = "container-fluid d-flex flex-wrap";
				add_location(div13, file$1, 168, 4, 5447);
				div14.className = "mx-auto col-10";
				add_location(div14, file$1, 164, 2, 5255);
				section3.className = "container-fluid section4";
				section3.id = "section4";
				add_location(section3, file$1, 163, 0, 5196);
				p2.className = "section-title text-center";
				add_location(p2, file$1, 196, 6, 6451);
				div15.className = "mx-auto col-8 d-flex justify-content-center align-items-center";
				add_location(div15, file$1, 195, 4, 6368);
				add_location(h5, file$1, 200, 6, 6563);
				div16.className = "text-center mt-3";
				add_location(div16, file$1, 199, 4, 6526);
				div17.className = "card-title text-center";
				set_style(div17, "font-size", "26pt");
				set_style(div17, "color", "#C07825");
				set_style(div17, "font-weight", "600");
				add_location(div17, file$1, 209, 10, 6829);
				add_location(h11, file$1, 212, 35, 6995);
				div18.className = "text-center";
				add_location(div18, file$1, 212, 10, 6970);
				div19.className = "card-header";
				add_location(div19, file$1, 208, 8, 6793);
				li0.className = "list-group-item";
				add_location(li0, file$1, 215, 10, 7094);
				li1.className = "list-group-item";
				add_location(li1, file$1, 216, 10, 7193);
				li2.className = "list-group-item";
				add_location(li2, file$1, 217, 10, 7295);
				li3.className = "list-group-item";
				add_location(li3, file$1, 218, 10, 7408);
				ul0.className = "list-group list-group-flush";
				add_location(ul0, file$1, 214, 8, 7043);
				a1.href = "#section6";
				attr(a1, "type", "button");
				a1.className = "btn btn-warning rounded-pill";
				add_location(a1, file$1, 221, 10, 7548);
				div20.className = "card-footer mt-auto";
				add_location(div20, file$1, 220, 8, 7504);
				div21.className = "card text-center";
				add_location(div21, file$1, 207, 6, 6754);
				div22.className = "card-title text-center";
				set_style(div22, "font-size", "26pt");
				set_style(div22, "color", "#667581");
				set_style(div22, "font-weight", "600");
				add_location(div22, file$1, 226, 10, 7826);
				add_location(h12, file$1, 229, 35, 7992);
				div23.className = "text-center";
				add_location(div23, file$1, 229, 10, 7967);
				div24.className = "card-header";
				add_location(div24, file$1, 225, 8, 7790);
				li4.className = "list-group-item";
				add_location(li4, file$1, 232, 10, 8092);
				li5.className = "list-group-item";
				add_location(li5, file$1, 233, 10, 8174);
				li6.className = "list-group-item";
				add_location(li6, file$1, 234, 10, 8281);
				ul1.className = "list-group list-group-flush";
				add_location(ul1, file$1, 231, 8, 8041);
				a2.href = "#section6";
				attr(a2, "type", "button");
				a2.className = "btn btn-warning rounded-pill";
				add_location(a2, file$1, 237, 10, 8488);
				div25.className = "card-footer mt-auto";
				add_location(div25, file$1, 236, 8, 8444);
				div26.className = "card text-center";
				add_location(div26, file$1, 224, 6, 7751);
				div27.className = "card-title text-center";
				set_style(div27, "font-size", "26pt");
				set_style(div27, "color", "#D7B642");
				set_style(div27, "font-weight", "600");
				add_location(div27, file$1, 242, 10, 8766);
				add_location(h13, file$1, 245, 35, 8930);
				div28.className = "text-center";
				add_location(div28, file$1, 245, 10, 8905);
				div29.className = "card-header";
				add_location(div29, file$1, 241, 8, 8730);
				li7.className = "list-group-item";
				add_location(li7, file$1, 248, 10, 9030);
				li8.className = "list-group-item";
				add_location(li8, file$1, 249, 10, 9112);
				li9.className = "list-group-item";
				add_location(li9, file$1, 250, 10, 9221);
				li10.className = "list-group-item";
				add_location(li10, file$1, 251, 10, 9344);
				ul2.className = "list-group list-group-flush";
				add_location(ul2, file$1, 247, 8, 8979);
				a3.href = "#section6";
				attr(a3, "type", "button");
				a3.className = "btn btn-warning rounded-pill";
				add_location(a3, file$1, 254, 10, 9528);
				div30.className = "card-footer mt-auto";
				add_location(div30, file$1, 253, 8, 9484);
				div31.className = "card text-center";
				add_location(div31, file$1, 240, 6, 8691);
				div32.className = "card-group my-5";
				add_location(div32, file$1, 206, 4, 6718);
				div33.className = "mx-auto col-10";
				add_location(div33, file$1, 194, 2, 6335);
				section4.className = "container-fluid section5";
				section4.id = "section5";
				add_location(section4, file$1, 193, 0, 6276);
				div34.className = "mx-auto col-10";
				add_location(div34, file$1, 262, 2, 9816);
				section5.className = "container-fluid section6";
				section5.id = "section6";
				add_location(section5, file$1, 261, 0, 9757);

				dispose = [
					listen(a0, "click", prevent_default(scrollIntoView)),
					listen(a1, "click", prevent_default(ctx.click_handler)),
					listen(a2, "click", prevent_default(ctx.click_handler_1)),
					listen(a3, "click", prevent_default(ctx.click_handler_2))
				];
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, section0, anchor);
				append(section0, div1);
				append(div1, div0);
				append(div0, h10);
				append(div0, t1);
				append(div0, a0);
				insert(target, t3, anchor);
				insert(target, section1, anchor);
				append(section1, div7);
				append(div7, div6);
				append(div6, div5);
				append(div5, div2);
				append(div5, t5);
				append(div5, div3);
				append(div5, t6);
				append(div5, div4);
				append(div7, t8);
				append(div7, img);
				insert(target, t9, anchor);
				insert(target, div8, anchor);
				insert(target, t10, anchor);
				insert(target, section2, anchor);
				append(section2, div11);
				append(div11, div9);
				append(div9, p0);
				append(div11, t12);
				append(div11, div10);

				for (var i = 0; i < each_blocks_1.length; i += 1) {
					each_blocks_1[i].m(div10, null);
				}

				insert(target, t13, anchor);
				insert(target, section3, anchor);
				append(section3, div14);
				append(div14, div12);
				append(div12, p1);
				append(div14, t15);
				append(div14, div13);

				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(div13, null);
				}

				insert(target, t16, anchor);
				insert(target, section4, anchor);
				append(section4, div33);
				append(div33, div15);
				append(div15, p2);
				append(div33, t18);
				append(div33, div16);
				append(div16, h5);
				append(div33, t20);
				append(div33, div32);
				append(div32, div21);
				append(div21, div19);
				append(div19, div17);
				append(div19, t22);
				append(div19, div18);
				append(div18, h11);
				append(div21, t24);
				append(div21, ul0);
				append(ul0, li0);
				append(ul0, t26);
				append(ul0, li1);
				append(ul0, t28);
				append(ul0, li2);
				append(ul0, t30);
				append(ul0, li3);
				append(div21, t32);
				append(div21, div20);
				append(div20, a1);
				append(div32, t34);
				append(div32, div26);
				append(div26, div24);
				append(div24, div22);
				append(div24, t36);
				append(div24, div23);
				append(div23, h12);
				append(div26, t38);
				append(div26, ul1);
				append(ul1, li4);
				append(ul1, t40);
				append(ul1, li5);
				append(ul1, t42);
				append(ul1, li6);
				append(div26, t44);
				append(div26, div25);
				append(div25, a2);
				append(div32, t46);
				append(div32, div31);
				append(div31, div29);
				append(div29, div27);
				append(div29, t48);
				append(div29, div28);
				append(div28, h13);
				append(div31, t50);
				append(div31, ul2);
				append(ul2, li7);
				append(ul2, t52);
				append(ul2, li8);
				append(ul2, t54);
				append(ul2, li9);
				append(ul2, t56);
				append(ul2, li10);
				append(div31, t58);
				append(div31, div30);
				append(div30, a3);
				insert(target, t60, anchor);
				insert(target, section5, anchor);
				append(section5, div34);
				mount_component(form_1, div34, null);
				current = true;
			},

			p: function update(changed, ctx) {
				if (changed.tasks) {
					each_value_1 = tasks;

					for (var i = 0; i < each_value_1.length; i += 1) {
						const child_ctx = get_each_context_1(ctx, each_value_1, i);

						if (each_blocks_1[i]) {
							each_blocks_1[i].p(changed, child_ctx);
						} else {
							each_blocks_1[i] = create_each_block_1(child_ctx);
							each_blocks_1[i].c();
							each_blocks_1[i].m(div10, null);
						}
					}

					for (; i < each_blocks_1.length; i += 1) {
						each_blocks_1[i].d(1);
					}
					each_blocks_1.length = each_value_1.length;
				}

				if (changed.projects) {
					each_value = projects;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(div13, null);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}

				var form_1_changes = {};
				if (!updating_form && changed.form) {
					form_1_changes.form = form;
				}
				form_1.$set(form_1_changes);
			},

			i: function intro(local) {
				if (current) return;
				form_1.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				form_1.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(section0);
					detach(t3);
					detach(section1);
					detach(t9);
					detach(div8);
					detach(t10);
					detach(section2);
				}

				destroy_each(each_blocks_1, detaching);

				if (detaching) {
					detach(t13);
					detach(section3);
				}

				destroy_each(each_blocks, detaching);

				if (detaching) {
					detach(t16);
					detach(section4);
					detach(t60);
					detach(section5);
				}

				form_1.$destroy();

				run_all(dispose);
			}
		};
	}

	let projects = [
	  {
	    title: "Лаборатория детства",
	    desc: "Формирование основ гармоничного развития детей в РС(Я)",
	    pic: "children_little.jpg",
	    href: "https://xn--80aacejg2b2cib.xn--p1ai/",
	  },
	  {
	    title: "Экосистема развития детской одаренности",
	    desc: "Раскрытие и развитие задатков, способностей учащихся начальных классов",
	    pic: "school_childrens.jpg",
	    href: "https://fondyakutia.ru/vib-2021-2023/sozdanie-uslovij-dlya-razvitiya-detej-shkolnogo-vozrasta/",
	  },
	  {
	    title: "Молодёжь: поддержка и развитие",
	    desc: "Формирование условий для опережающего развития потенциала молодежи",
	    pic: "younger.jpg",
	    href: "https://fondyakutia.ru/vib-2021-2023/molodezh-podderzhka-i-razvitie/",
	  },
	  {
	    title: "Центр компетенций по вопросам городской среды LETO",
	    desc: "Сохранение окружающей среды для будущих поколений",
	    pic: "leto.jpg",
	    href: "https://letoyakutia.ru/",
	  },
	  {
	    title: "Региональный центр выявления и поддержки одареных детей",
	    desc: "Создание вдохновляющей среды для развития юных талантов",
	    pic: "man.jpg",
	    href: "https://lensky-kray.ru/",
	  },
	  {
	    title: "Инновационные центры",
	    desc: "Расширение сети инновационных центров развития детей по всей республике",
	    pic: "open.jpg",
	    href: "https://tpykt.ru/about/",
	  },
	];

	let tasks = [
	  {
	    pic: "handshaking.jpg",
	    task: "<b>НАЛАДИТЬ устойчивую сеть</b> партнерских связей в интересах всестороннего развития подрастающих поколении",
	  },
	  {
	    pic: "mech_lamp.jpg",
	    task: "<b>ОБЕСПЕЧИТЬ планомерное строительство</b> знаковых инновационных объектов",
	  },
	  {
	    pic: "love_hands.jpg",
	    task: "При создании социальной инфраструктуры <b>ОБЕСПЕЧИТЬ повышение качества и комфорта</b> городской и сельской среды и удовлетворение интересов целевых групп населения",
	  },
	  {
	    pic: "ruble.jpg",
	    task: "<b>К 2026 г.</b> кратно (минимум в 2 раза) <b>УВЕЛИЧИТЬ объем пожертвований</b> на реализацию проектов",
	  },
	  {
	    pic: "progress.jpg",
	    task: "Значительно <b>ПОВЫСИТЬ устойчивость фонда</b> в длительной перспективе через наращивание активов и создание эндаумент-фонда",
	  },
	];

	function scrollIntoView({ target }) {
	  const el = document.querySelector(target.getAttribute("href"));
	  if (!el) return;
	  el.scrollIntoView({
	    behavior: "smooth",
	  });
	}

	let form = {
	  name: "",
	  email: "",
	  phone: "",
	  level: 0,
	};

	function setLevel(level) {
	  form.level = level;
	  console.log(form);
	  document.getElementById('form-select').value = level;
	}

	function instance$1($$self, $$props, $$invalidate) {
		function click_handler({ target }) {setLevel(1); scrollIntoView({ target });}

		function click_handler_1({ target }) {setLevel(2); scrollIntoView({ target });}

		function click_handler_2({ target }) {setLevel(3); scrollIntoView({ target });}

		function form_1_form_binding(value) {
			form = value;
			$$invalidate('form', form);
		}

		return {
			click_handler,
			click_handler_1,
			click_handler_2,
			form_1_form_binding
		};
	}

	class Homepage extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$1, create_fragment$1, safe_not_equal, []);
		}
	}

	/* src/app/component/GetList.svelte generated by Svelte v3.1.0 */

	const file$2 = "src/app/component/GetList.svelte";

	function get_each_context$1(ctx, list, i) {
		const child_ctx = Object.create(ctx);
		child_ctx.element = list[i];
		return child_ctx;
	}

	// (37:0) {:catch error}
	function create_catch_block$1(ctx) {
		var small, t_value = ctx.error.message, t;

		return {
			c: function create() {
				small = element("small");
				t = text(t_value);
				small.className = "form-text text-danger";
				add_location(small, file$2, 37, 2, 731);
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
	function create_then_block$1(ctx) {
		var each_1_anchor;

		var each_value = ctx.response;

		var each_blocks = [];

		for (var i = 0; i < each_value.length; i += 1) {
			each_blocks[i] = create_each_block$1(get_each_context$1(ctx, each_value, i));
		}

		return {
			c: function create() {
				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].c();
				}

				each_1_anchor = empty();
			},

			m: function mount(target, anchor) {
				for (var i = 0; i < each_blocks.length; i += 1) {
					each_blocks[i].m(target, anchor);
				}

				insert(target, each_1_anchor, anchor);
			},

			p: function update(changed, ctx) {
				if (changed.promise) {
					each_value = ctx.response;

					for (var i = 0; i < each_value.length; i += 1) {
						const child_ctx = get_each_context$1(ctx, each_value, i);

						if (each_blocks[i]) {
							each_blocks[i].p(changed, child_ctx);
						} else {
							each_blocks[i] = create_each_block$1(child_ctx);
							each_blocks[i].c();
							each_blocks[i].m(each_1_anchor.parentNode, each_1_anchor);
						}
					}

					for (; i < each_blocks.length; i += 1) {
						each_blocks[i].d(1);
					}
					each_blocks.length = each_value.length;
				}
			},

			d: function destroy(detaching) {
				destroy_each(each_blocks, detaching);

				if (detaching) {
					detach(each_1_anchor);
				}
			}
		};
	}

	// (32:2) {#each response as element}
	function create_each_block$1(ctx) {
		var div, t0_value = ctx.element.name, t0, t1;

		return {
			c: function create() {
				div = element("div");
				t0 = text(t0_value);
				t1 = space();
				div.className = "p-2 text-left";
				set_style(div, "height", "30vh");
				add_location(div, file$2, 32, 4, 623);
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				append(div, t0);
				append(div, t1);
			},

			p: function update(changed, ctx) {
				if ((changed.promise) && t0_value !== (t0_value = ctx.element.name)) {
					set_data(t0, t0_value);
				}
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}
			}
		};
	}

	// (29:16)    <div class="spinner-border mt-3" role="status" /> {:then response}
	function create_pending_block$1(ctx) {
		var div;

		return {
			c: function create() {
				div = element("div");
				div.className = "spinner-border mt-3";
				attr(div, "role", "status");
				add_location(div, file$2, 29, 2, 522);
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

	function create_fragment$2(ctx) {
		var await_block_anchor, promise_1;

		let info = {
			ctx,
			current: null,
			pending: create_pending_block$1,
			then: create_then_block$1,
			catch: create_catch_block$1,
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

	function instance$2($$self, $$props, $$invalidate) {
		let { level } = $$props;
	  let promise = getList();

	  async function getList() {
	    const res = await fetch(`api/v1/donator/${level}`);
	    const text = await res.json();

	    if (res.ok) {
	      return text;
	    } else {
	      throw text;
	    }
	  }

		$$self.$set = $$props => {
			if ('level' in $$props) $$invalidate('level', level = $$props.level);
		};

		return { level, promise };
	}

	class GetList extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$2, create_fragment$2, safe_not_equal, ["level"]);

			const { ctx } = this.$$;
			const props = options.props || {};
			if (ctx.level === undefined && !('level' in props)) {
				console.warn("<GetList> was created without expected prop 'level'");
			}
		}

		get level() {
			throw new Error("<GetList>: Props cannot be read directly from the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}

		set level(value) {
			throw new Error("<GetList>: Props cannot be set directly on the component instance unless compiling with 'accessors: true' or '<svelte:options accessors/>'");
		}
	}

	/* src/app/pages/Donators.svelte generated by Svelte v3.1.0 */

	const file$3 = "src/app/pages/Donators.svelte";

	function create_fragment$3(ctx) {
		var main, h10, t1, div0, t2, h11, t4, div1, t5, h12, t7, div2, current;

		var getlist0 = new GetList({ props: { level: "3" }, $$inline: true });

		var getlist1 = new GetList({ props: { level: "2" }, $$inline: true });

		var getlist2 = new GetList({ props: { level: "1" }, $$inline: true });

		return {
			c: function create() {
				main = element("main");
				h10 = element("h1");
				h10.textContent = "Gold";
				t1 = space();
				div0 = element("div");
				getlist0.$$.fragment.c();
				t2 = space();
				h11 = element("h1");
				h11.textContent = "Silver";
				t4 = space();
				div1 = element("div");
				getlist1.$$.fragment.c();
				t5 = space();
				h12 = element("h1");
				h12.textContent = "Bronze";
				t7 = space();
				div2 = element("div");
				getlist2.$$.fragment.c();
				h10.className = "text-center";
				set_style(h10, "padding-top", "15vh");
				set_style(h10, "font-weight", "700");
				set_style(h10, "color", "#D7B642");
				set_style(h10, "font-size", "50pt");
				add_location(h10, file$3, 5, 2, 82);
				div0.className = "justify-content-between text-center d-flex col-11 mx-auto mt-5 names";
				add_location(div0, file$3, 11, 2, 214);
				h11.className = "text-center";
				set_style(h11, "padding-top", "15vh");
				set_style(h11, "font-weight", "700");
				set_style(h11, "color", "#667581");
				set_style(h11, "font-size", "50pt");
				add_location(h11, file$3, 17, 2, 342);
				div1.className = "justify-content-between text-center d-flex col-11 mx-auto mt-5 names";
				add_location(div1, file$3, 23, 2, 476);
				h12.className = "text-center";
				set_style(h12, "padding-top", "15vh");
				set_style(h12, "font-weight", "700");
				set_style(h12, "color", "#C07825");
				set_style(h12, "font-size", "50pt");
				add_location(h12, file$3, 29, 2, 604);
				div2.className = "justify-content-between text-center d-flex col-11 mx-auto mt-5 names";
				add_location(div2, file$3, 35, 2, 738);
				add_location(main, file$3, 4, 0, 73);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, main, anchor);
				append(main, h10);
				append(main, t1);
				append(main, div0);
				mount_component(getlist0, div0, null);
				append(main, t2);
				append(main, h11);
				append(main, t4);
				append(main, div1);
				mount_component(getlist1, div1, null);
				append(main, t5);
				append(main, h12);
				append(main, t7);
				append(main, div2);
				mount_component(getlist2, div2, null);
				current = true;
			},

			p: noop,

			i: function intro(local) {
				if (current) return;
				getlist0.$$.fragment.i(local);

				getlist1.$$.fragment.i(local);

				getlist2.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				getlist0.$$.fragment.o(local);
				getlist1.$$.fragment.o(local);
				getlist2.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(main);
				}

				getlist0.$destroy();

				getlist1.$destroy();

				getlist2.$destroy();
			}
		};
	}

	class Donators extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, null, create_fragment$3, safe_not_equal, []);
		}
	}

	/* src/app/pages/Card.svelte generated by Svelte v3.1.0 */

	const file$4 = "src/app/pages/Card.svelte";

	function create_fragment$4(ctx) {
		var main, h10, t1, h60, t3, img, t4, h11, t6, div2, div0, h40, t8, h61, t10, div1, h41, t12, h62, t13, span, t15, h12, t17, div5, div3, h42, t19, h63, t21, div4, h43, t23, h64;

		return {
			c: function create() {
				main = element("main");
				h10 = element("h1");
				h10.textContent = "Карта для тех, кому небезразлична Якутия";
				t1 = space();
				h60 = element("h6");
				h60.textContent = "Помогайте любимой Якутии с каждой покупкой и сами получайте доход от карты";
				t3 = space();
				img = element("img");
				t4 = space();
				h11 = element("h1");
				h11.textContent = "Благодарность за помощь Якутии";
				t6 = space();
				div2 = element("div");
				div0 = element("div");
				h40 = element("h4");
				h40.textContent = "1% кэшбек с каждой покупки";
				t8 = space();
				h61 = element("h6");
				h61.textContent = "Перечисляем в целевой фонд будущих поколений Республики Саха (Якутия)";
				t10 = space();
				div1 = element("div");
				h41 = element("h4");
				h41.textContent = "Станьте членом сообщества меценатов";
				t12 = space();
				h62 = element("h6");
				t13 = text("При тратах свыше 20'000₽ в месяц этой картой вы получаете привилегии подписки уровня ");
				span = element("span");
				span.textContent = "BRONZE";
				t15 = space();
				h12 = element("h1");
				h12.textContent = "Поддерживайте Якутию с нами";
				t17 = space();
				div5 = element("div");
				div3 = element("div");
				h42 = element("h4");
				h42.textContent = "1% с каждой покупки";
				t19 = space();
				h63 = element("h6");
				h63.textContent = "Перечисляем в целевой фонд будущих поколений Республики Саха (Якутия)";
				t21 = space();
				div4 = element("div");
				h43 = element("h4");
				h43.textContent = "Плата за обслуживание";
				t23 = space();
				h64 = element("h6");
				h64.textContent = "Перечисляем в целевой фонд будущих поколений Республики Саха (Якутия)";
				h10.className = "text-center";
				set_style(h10, "padding-top", "20vh");
				set_style(h10, "font-weight", "700");
				add_location(h10, file$4, 1, 2, 115);
				h60.className = "text-center pt-4";
				add_location(h60, file$4, 2, 2, 234);
				img.className = "col-4 mx-auto";
				img.src = "pictures/card.png";
				img.alt = "card";
				add_location(img, file$4, 3, 2, 356);
				h11.className = "text-center";
				set_style(h11, "font-weight", "700");
				add_location(h11, file$4, 5, 2, 431);
				h40.className = "text-left";
				set_style(h40, "font-weight", "600");
				add_location(h40, file$4, 8, 6, 684);
				h61.className = "text-left";
				add_location(h61, file$4, 11, 6, 785);
				div0.className = "rounded-lg mt-5 p-4";
				set_style(div0, "width", "60vh");
				set_style(div0, "height", "20vh");
				set_style(div0, "background-color", "white");
				add_location(div0, file$4, 7, 4, 585);
				h41.className = "text-left";
				set_style(h41, "font-weight", "600");
				add_location(h41, file$4, 16, 6, 1018);
				set_style(span, "color", "#C07825");
				add_location(span, file$4, 20, 93, 1244);
				h62.className = "text-left";
				add_location(h62, file$4, 19, 6, 1128);
				div1.className = "rounded-lg ml-5 mt-5 p-4";
				set_style(div1, "width", "100vh");
				set_style(div1, "height", "20vh");
				set_style(div1, "background-color", "white");
				add_location(div1, file$4, 15, 4, 913);
				div2.className = "text-center justify-content-center d-flex mb-5";
				add_location(div2, file$4, 6, 2, 520);
				h12.className = "text-center";
				set_style(h12, "font-weight", "700");
				add_location(h12, file$4, 26, 2, 1324);
				h42.className = "text-left";
				set_style(h42, "font-weight", "600");
				add_location(h42, file$4, 29, 6, 1573);
				h63.className = "text-left";
				add_location(h63, file$4, 32, 6, 1667);
				div3.className = "rounded-lg mt-5 p-4";
				set_style(div3, "width", "80vh");
				set_style(div3, "height", "20vh");
				set_style(div3, "background-color", "white");
				add_location(div3, file$4, 28, 4, 1474);
				h43.className = "text-left";
				set_style(h43, "font-weight", "600");
				add_location(h43, file$4, 37, 6, 1899);
				h64.className = " text-left";
				add_location(h64, file$4, 40, 6, 1995);
				div4.className = "rounded-lg ml-5 mt-5 p-4";
				set_style(div4, "width", "80vh");
				set_style(div4, "height", "20vh");
				set_style(div4, "background-color", "white");
				add_location(div4, file$4, 36, 4, 1795);
				div5.className = "text-center justify-content-center d-flex mb-5";
				add_location(div5, file$4, 27, 2, 1409);
				main.className = "text-center justify-content-center";
				set_style(main, "font-family", "Montserrat");
				set_style(main, "background-color", "whitesmoke");
				add_location(main, file$4, 0, 0, 0);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, main, anchor);
				append(main, h10);
				append(main, t1);
				append(main, h60);
				append(main, t3);
				append(main, img);
				append(main, t4);
				append(main, h11);
				append(main, t6);
				append(main, div2);
				append(div2, div0);
				append(div0, h40);
				append(div0, t8);
				append(div0, h61);
				append(div2, t10);
				append(div2, div1);
				append(div1, h41);
				append(div1, t12);
				append(div1, h62);
				append(h62, t13);
				append(h62, span);
				append(main, t15);
				append(main, h12);
				append(main, t17);
				append(main, div5);
				append(div5, div3);
				append(div3, h42);
				append(div3, t19);
				append(div3, h63);
				append(div5, t21);
				append(div5, div4);
				append(div4, h43);
				append(div4, t23);
				append(div4, h64);
			},

			p: noop,
			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(main);
				}
			}
		};
	}

	class Card extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, null, create_fragment$4, safe_not_equal, []);
		}
	}

	/* src/app/pages/Notfound.svelte generated by Svelte v3.1.0 */

	const file$5 = "src/app/pages/Notfound.svelte";

	function create_fragment$5(ctx) {
		var h1;

		return {
			c: function create() {
				h1 = element("h1");
				h1.textContent = "Page not found";
				h1.className = "text-center";
				set_style(h1, "margin-top", "43vh");
				add_location(h1, file$5, 0, 0, 0);
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
			init(this, options, null, create_fragment$5, safe_not_equal, []);
		}
	}

	/* src/app/routing/Router.svelte generated by Svelte v3.1.0 */

	const file$6 = "src/app/routing/Router.svelte";

	function create_fragment$6(ctx) {
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
				add_location(main, file$6, 29, 0, 681);
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

	function instance$3($$self, $$props, $$invalidate) {
		

	  let value = Notfound;

	  hash.subscribe( valu => {
	    blockMain.update(v => false);
	    switch(valu) {
	      case '':
	        blockMain.update(v => true);
	        $$invalidate('value', value = Homepage);
	        break;
	      case 'donators':
	        $$invalidate('value', value = Donators);
	        break;
	      case 'card':
	        $$invalidate('value', value = Card);
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
			init(this, options, instance$3, create_fragment$6, safe_not_equal, []);
		}
	}

	/* src/app/component/Navbar.svelte generated by Svelte v3.1.0 */

	const file$7 = "src/app/component/Navbar.svelte";

	// (40:10) {:else}
	function create_else_block_1(ctx) {
		var a;

		return {
			c: function create() {
				a = element("a");
				a.textContent = "О фонде";
				a.className = "nav-link";
				a.href = "#/";
				add_location(a, file$7, 40, 12, 1124);
			},

			m: function mount(target, anchor) {
				insert(target, a, anchor);
			},

			p: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(a);
				}
			}
		};
	}

	// (34:10) {#if blockMainValue}
	function create_if_block_1(ctx) {
		var a, dispose;

		return {
			c: function create() {
				a = element("a");
				a.textContent = "О фонде";
				a.className = "nav-link";
				a.href = "#section2";
				add_location(a, file$7, 34, 12, 949);
				dispose = listen(a, "click", prevent_default(scrollIntoView));
			},

			m: function mount(target, anchor) {
				insert(target, a, anchor);
			},

			p: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(a);
				}

				dispose();
			}
		};
	}

	// (51:10) {:else}
	function create_else_block(ctx) {
		var a;

		return {
			c: function create() {
				a = element("a");
				a.textContent = "Проекты";
				a.className = "nav-link";
				a.href = "#/";
				add_location(a, file$7, 51, 12, 1434);
			},

			m: function mount(target, anchor) {
				insert(target, a, anchor);
			},

			p: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(a);
				}
			}
		};
	}

	// (45:10) {#if blockMainValue}
	function create_if_block$1(ctx) {
		var a, dispose;

		return {
			c: function create() {
				a = element("a");
				a.textContent = "Проекты";
				a.className = "nav-link";
				a.href = "#section4";
				add_location(a, file$7, 45, 10, 1267);
				dispose = listen(a, "click", prevent_default(scrollIntoView));
			},

			m: function mount(target, anchor) {
				insert(target, a, anchor);
			},

			p: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(a);
				}

				dispose();
			}
		};
	}

	function create_fragment$7(ctx) {
		var nav, div1, a0, img, t0, button, span, t1, div0, ul, li0, t2, li1, t3, li2, a1, t5, li3, a2;

		function select_block_type(ctx) {
			if (ctx.blockMainValue) return create_if_block_1;
			return create_else_block_1;
		}

		var current_block_type = select_block_type(ctx);
		var if_block0 = current_block_type(ctx);

		function select_block_type_1(ctx) {
			if (ctx.blockMainValue) return create_if_block$1;
			return create_else_block;
		}

		var current_block_type_1 = select_block_type_1(ctx);
		var if_block1 = current_block_type_1(ctx);

		return {
			c: function create() {
				nav = element("nav");
				div1 = element("div");
				a0 = element("a");
				img = element("img");
				t0 = space();
				button = element("button");
				span = element("span");
				t1 = space();
				div0 = element("div");
				ul = element("ul");
				li0 = element("li");
				if_block0.c();
				t2 = space();
				li1 = element("li");
				if_block1.c();
				t3 = space();
				li2 = element("li");
				a1 = element("a");
				a1.textContent = "Меценаты";
				t5 = space();
				li3 = element("li");
				a2 = element("a");
				a2.textContent = "Карта";
				img.src = "pictures/do_for_nation_logo_white.svg";
				img.alt = "logo";
				add_location(img, file$7, 17, 6, 421);
				a0.className = "navbar-brand";
				a0.href = "#/";
				add_location(a0, file$7, 16, 4, 380);
				span.className = "navbar-toggler-icon";
				add_location(span, file$7, 28, 6, 729);
				button.className = "navbar-toggler";
				button.type = "button";
				button.dataset.bsToggle = "collapse";
				button.dataset.bsTarget = "#navbarNav";
				attr(button, "aria-controls", "navbarNav");
				attr(button, "aria-expanded", "false");
				attr(button, "aria-label", "Toggle navigation");
				add_location(button, file$7, 19, 4, 497);
				li0.className = "nav-item";
				add_location(li0, file$7, 32, 8, 884);
				li1.className = "nav-item";
				add_location(li1, file$7, 43, 8, 1204);
				a1.className = "nav-link";
				a1.href = "#/donators";
				add_location(a1, file$7, 55, 10, 1546);
				li2.className = "nav-item";
				add_location(li2, file$7, 54, 8, 1514);
				a2.className = "nav-link";
				a2.href = "#/card";
				add_location(a2, file$7, 58, 10, 1651);
				li3.className = "nav-item";
				add_location(li3, file$7, 57, 8, 1619);
				ul.className = "navbar-nav ml-auto";
				add_location(ul, file$7, 31, 6, 844);
				div0.className = "collapse navbar-collapse";
				div0.id = "navbarNav";
				add_location(div0, file$7, 30, 4, 784);
				div1.className = "container-fluid col-10 mx-auto";
				add_location(div1, file$7, 15, 2, 331);
				nav.className = "navbar navbar-expand-sm navbar-dark fixed-top";
				set_style(nav, "background-color", "#000");
				set_style(nav, "padding", "20px 0");
				add_location(nav, file$7, 11, 0, 215);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, nav, anchor);
				append(nav, div1);
				append(div1, a0);
				append(a0, img);
				append(div1, t0);
				append(div1, button);
				append(button, span);
				append(div1, t1);
				append(div1, div0);
				append(div0, ul);
				append(ul, li0);
				if_block0.m(li0, null);
				append(ul, t2);
				append(ul, li1);
				if_block1.m(li1, null);
				append(ul, t3);
				append(ul, li2);
				append(li2, a1);
				append(ul, t5);
				append(ul, li3);
				append(li3, a2);
			},

			p: function update(changed, ctx) {
				if (current_block_type === (current_block_type = select_block_type(ctx)) && if_block0) {
					if_block0.p(changed, ctx);
				} else {
					if_block0.d(1);
					if_block0 = current_block_type(ctx);
					if (if_block0) {
						if_block0.c();
						if_block0.m(li0, null);
					}
				}

				if (current_block_type_1 === (current_block_type_1 = select_block_type_1(ctx)) && if_block1) {
					if_block1.p(changed, ctx);
				} else {
					if_block1.d(1);
					if_block1 = current_block_type_1(ctx);
					if (if_block1) {
						if_block1.c();
						if_block1.m(li1, null);
					}
				}
			},

			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(nav);
				}

				if_block0.d();
				if_block1.d();
			}
		};
	}

	function instance$4($$self, $$props, $$invalidate) {
		

	  let blockMainValue;
	  blockMain.subscribe(value => {
	    $$invalidate('blockMainValue', blockMainValue = value);
	  });

		return { blockMainValue };
	}

	class Navbar extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, instance$4, create_fragment$7, safe_not_equal, []);
		}
	}

	/* src/app/component/Footer.svelte generated by Svelte v3.1.0 */

	const file$8 = "src/app/component/Footer.svelte";

	function create_fragment$8(ctx) {
		var footer, img, t, div;

		return {
			c: function create() {
				footer = element("footer");
				img = element("img");
				t = space();
				div = element("div");
				div.textContent = "© All rights reserved";
				img.src = "pictures/logo.jpg";
				img.className = "position-absolute";
				set_style(img, "height", "80%");
				set_style(img, "left", "60px");
				set_style(img, "top", "20px");
				img.alt = "sunrise logo";
				add_location(img, file$8, 1, 4, 113);
				div.className = "text-center text-white";
				set_style(div, "margin-top", "40px");
				add_location(div, file$8, 2, 4, 236);
				footer.className = "d-flex justify-content-center position-relative";
				set_style(footer, "height", "100px");
				set_style(footer, "background", "#35393f");
				add_location(footer, file$8, 0, 0, 0);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, footer, anchor);
				append(footer, img);
				append(footer, t);
				append(footer, div);
			},

			p: noop,
			i: noop,
			o: noop,

			d: function destroy(detaching) {
				if (detaching) {
					detach(footer);
				}
			}
		};
	}

	class Footer extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, null, create_fragment$8, safe_not_equal, []);
		}
	}

	/* src/App.svelte generated by Svelte v3.1.0 */

	const file$9 = "src/App.svelte";

	function create_fragment$9(ctx) {
		var div, t0, t1, current;

		var navbar = new Navbar({ $$inline: true });

		var router = new Router({ $$inline: true });

		var footer = new Footer({ $$inline: true });

		return {
			c: function create() {
				div = element("div");
				navbar.$$.fragment.c();
				t0 = space();
				router.$$.fragment.c();
				t1 = space();
				footer.$$.fragment.c();
				div.className = "app-shell svelte-hrds2b";
				add_location(div, file$9, 16, 0, 292);
			},

			l: function claim(nodes) {
				throw new Error("options.hydrate only works if the component was compiled with the `hydratable: true` option");
			},

			m: function mount(target, anchor) {
				insert(target, div, anchor);
				mount_component(navbar, div, null);
				append(div, t0);
				mount_component(router, div, null);
				append(div, t1);
				mount_component(footer, div, null);
				current = true;
			},

			p: noop,

			i: function intro(local) {
				if (current) return;
				navbar.$$.fragment.i(local);

				router.$$.fragment.i(local);

				footer.$$.fragment.i(local);

				current = true;
			},

			o: function outro(local) {
				navbar.$$.fragment.o(local);
				router.$$.fragment.o(local);
				footer.$$.fragment.o(local);
				current = false;
			},

			d: function destroy(detaching) {
				if (detaching) {
					detach(div);
				}

				navbar.$destroy();

				router.$destroy();

				footer.$destroy();
			}
		};
	}

	class App extends SvelteComponentDev {
		constructor(options) {
			super(options);
			init(this, options, null, create_fragment$9, safe_not_equal, []);
		}
	}

	const app = new App({
		target: document.body.querySelector('#app')
	});

	return app;

}());
//# sourceMappingURL=bundle.js.map
