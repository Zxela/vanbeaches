"""Optional Blender sidebar. Run this text once; no auto-run or external imports required."""

import bpy


class COAST_OT_view(bpy.types.Operator):
    bl_idname = "coast.view"
    bl_label = "Coast view"
    camera_name: bpy.props.StringProperty()

    def execute(self, context):
        context.scene.camera = bpy.data.objects[self.camera_name]
        if self.camera_name.startswith("Shore approach"):
            context.scene.frame_set(context.scene.frame_end)
        for area in context.screen.areas:
            if area.type == "VIEW_3D":
                area.spaces.active.region_3d.view_perspective = "CAMERA"
        return {"FINISHED"}


class COAST_OT_tide(bpy.types.Operator):
    bl_idname = "coast.tide"
    bl_label = "Set tide (metres Chart Datum)"
    height: bpy.props.FloatProperty()

    def execute(self, context):
        ocean = bpy.data.objects["Ocean"]
        ocean["play_tide_demo"] = False
        ocean["tide_height_cd"] = self.height
        ocean.update_tag()
        context.view_layer.update()
        return {"FINISHED"}


class COAST_OT_demo(bpy.types.Operator):
    bl_idname = "coast.demo"
    bl_label = "Play approach and rising tide"

    def execute(self, context):
        ocean = bpy.data.objects["Ocean"]
        ocean["play_tide_demo"] = True
        ocean["display_mode"] = 0
        ocean.update_tag()
        context.scene.camera = bpy.data.objects["Shore approach — Spanish Banks"]
        context.scene.frame_set(1)
        for area in context.screen.areas:
            if area.type == "VIEW_3D":
                area.spaces.active.region_3d.view_perspective = "CAMERA"
        if not context.screen.is_animation_playing:
            bpy.ops.screen.animation_play()
        return {"FINISHED"}


class COAST_OT_explore(bpy.types.Operator):
    bl_idname = "coast.explore"
    bl_label = "Fly from here"
    bl_description = (
        "Copy the current camera to an unanimated view; Shift + ` starts fly navigation"
    )

    def execute(self, context):
        source = context.scene.camera.evaluated_get(context.evaluated_depsgraph_get())
        camera = bpy.data.objects.get("Free exploration")
        if camera is None:
            camera = bpy.data.objects.new("Free exploration", source.data.copy())
            bpy.data.collections["Cameras"].objects.link(camera)
        camera.matrix_world = source.matrix_world.copy()
        camera.data.lens = source.data.lens
        context.scene.camera = camera
        for area in context.screen.areas:
            if area.type == "VIEW_3D":
                area.spaces.active.region_3d.view_perspective = "CAMERA"
        return {"FINISHED"}


class COAST_PT_controls(bpy.types.Panel):
    bl_label = "Van Beaches"
    bl_idname = "COAST_PT_controls"
    bl_space_type = "VIEW_3D"
    bl_region_type = "UI"
    bl_category = "Coast"

    def draw(self, context):
        layout = self.layout
        ocean = bpy.data.objects.get("Ocean")
        if ocean is None:
            return
        if "Shore approach — Spanish Banks" in bpy.data.objects:
            layout.operator("coast.demo", icon="PLAY")
            duration = context.scene.frame_end / context.scene.render.fps
            layout.label(text=f"{duration:g}-second accelerated tide study")
            layout.prop(ocean, '["play_tide_demo"]', text="Animate tide")
        layout.operator("coast.explore", icon="VIEW_CAMERA")
        row = layout.row()
        row.enabled = not ocean["play_tide_demo"]
        row.prop(ocean, '["tide_height_cd"]', text="Tide (m CD)")
        row = layout.row(align=True)
        for tide in ocean["test_states_cd_m"]:
            row.operator("coast.tide", text=f"{tide:g}").height = tide
        layout.label(text=f"Water elevation: {ocean.location.z:.2f} m CGVD28")
        layout.prop(ocean, '["display_mode"]', text="0 Natural / 1 Depth / 2 Sources")
        layout.prop(ocean, '["wave_amplitude_m"]', text="Wave normal amplitude")
        for label, name in (
            ("Overview", "Overview"),
            ("At the shore", "Shore approach — Spanish Banks"),
            ("Coastline", "Point Grey to Kitsilano"),
        ):
            if name in bpy.data.objects:
                layout.operator("coast.view", text=label).camera_name = name
        layout.label(text="Shift + ` to fly; Esc to leave fly mode")
        layout.label(text="Space pauses playback; Z changes shading")


CLASSES = (COAST_OT_view, COAST_OT_tide, COAST_OT_demo, COAST_OT_explore, COAST_PT_controls)


def register():
    for cls in CLASSES:
        old = getattr(bpy.types, cls.__name__, None)
        if old:
            bpy.utils.unregister_class(old)
        bpy.utils.register_class(cls)


if __name__ == "__main__":
    register()
