<?php

use PHPUnit\Framework\TestCase;
use App\Helpers\MergeHelper;

class MergeHelperTest extends TestCase
{
    public function testNoChanges()
    {
        $original = "block A\nblock B\nblock C";
        $yours = "block A\nblock B\nblock C";
        $theirs = "block A\nblock B\nblock C";

        $result = MergeHelper::merge($original, $yours, $theirs);
        $this->assertTrue($result['success']);
        $this->assertEquals($original, $result['merged']);
    }

    public function testOnlyTheirsChanged()
    {
        $original = "block A\nblock B\nblock C";
        $yours = "block A\nblock B\nblock C";
        $theirs = "block A\nblock B modified\nblock C";

        $result = MergeHelper::merge($original, $yours, $theirs);
        $this->assertTrue($result['success']);
        $this->assertEquals($theirs, $result['merged']);
    }

    public function testOnlyYoursChanged()
    {
        $original = "block A\nblock B\nblock C";
        $yours = "block A modified\nblock B\nblock C";
        $theirs = "block A\nblock B\nblock C"; // Stale/Lagging client

        $result = MergeHelper::merge($original, $yours, $theirs);
        $this->assertTrue($result['success']);
        $this->assertEquals($yours, $result['merged']);
    }

    public function testBothMadeIdenticalChanges()
    {
        $original = "block A\nblock B\nblock C";
        $yours = "block A\nblock B modified\nblock C";
        $theirs = "block A\nblock B modified\nblock C";

        $result = MergeHelper::merge($original, $yours, $theirs);
        $this->assertTrue($result['success']);
        $this->assertEquals($yours, $result['merged']);
    }

    public function testConflict()
    {
        $original = "block A\nblock B\nblock C";
        $yours = "block A\nblock B yours\nblock C";
        $theirs = "block A\nblock B theirs\nblock C";

        $result = MergeHelper::merge($original, $yours, $theirs);
        $this->assertFalse($result['success']);
        $this->assertNotEmpty($result['conflicts']);
    }
}
